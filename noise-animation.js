/**
MIT License

Copyright (c) 2025 kthread

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

class NoiseAnimation {
  constructor() {
    this.canvas = document.getElementById("noise-canvas");
    this.ctx = null;
    this.device = null;
    this.context = null;
    this.pipeline = null;
    this.bindGroup = null;
    this.uniformBuffer = null;
    this.uniformValues = null;
    this.startTime = performance.now();
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    this.init();
  }

  async init() {
    if (this.reducedMotion) return;

    // Try WebGPU
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          this.device = await adapter.requestDevice();
          this.context = this.canvas.getContext("webgpu");
          const format = navigator.gpu.getPreferredCanvasFormat();
          this.context.configure({ device: this.device, format, alphaMode: 'premultiplied' });
          await this.initWebGPU(format);
          this.animateWebGPU();
          console.log("Using WebGPU");
          return;
        }
      } catch (e) {
        console.warn("WebGPU failed, falling back", e);
      }
    }

    // Try WebGL
    this.gl = this.canvas.getContext("webgl2") || this.canvas.getContext("webgl");
    if (this.gl) {
      this.initWebGL();
      this.animateWebGL();
      console.log("Using WebGL");
      return;
    }

    // Fallback to Canvas 2D
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas2D();
    this.animateCanvas2D();
    console.log("Using Canvas 2D");
  }

  async initWebGPU(format) {
    const shaderModule = this.device.createShaderModule({
      code: `
        struct Uniforms {
          time: f32,
          width: f32,
          height: f32,
          scale: f32,
        }
        @group(0) @binding(0) var<uniform> u: Uniforms;

        @vertex
        fn vs_main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
          var pos = array<vec2f, 4>(vec2f(-1,-1), vec2f(1,-1), vec2f(-1,1), vec2f(1,1));
          return vec4f(pos[vi], 0, 1);
        }

        fn rand(st: vec2f) -> f32 {
          return fract(sin(dot(st, vec2f(12.9898, 78.233))) * 43758.5453123);
        }

        @fragment
        fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
          let st = pos.xy / vec2f(u.width, u.height);
          let t = u.time * 0.0005;
          
          // High frequency noise
          let noise = rand(st + t);
          
          // Very subtle alpha
          let alpha = noise * 0.05;
          
          // Neutral grey noise
          return vec4f(alpha, alpha, alpha, alpha);
        }
      `
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: shaderModule, entryPoint: 'vs_main' },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format, blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
        }}]
      },
      primitive: { topology: 'triangle-strip' }
    });

    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.uniformValues = new Float32Array(4);

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
    });
  }

  animateWebGPU() {
    const frame = () => {
      const time = performance.now() - this.startTime;
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }

      this.uniformValues[0] = time;
      this.uniformValues[1] = width;
      this.uniformValues[2] = height;
      this.uniformValues[3] = 1.0;
      
      this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformValues);

      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store'
        }]
      });
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.draw(4);
      pass.end();
      this.device.queue.submit([encoder.finish()]);
      
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  initWebGL() {
    const vs = `attribute vec2 p; void main(){gl_Position=vec4(p,0,1);}`;
    const fs = `precision mediump float; uniform float t; uniform vec2 r;
      float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
      void main() {
        vec2 st = gl_FragCoord.xy / r;
        float noise = rand(st + t);
        float alpha = noise * 0.05;
        gl_FragColor = vec4(alpha, alpha, alpha, alpha);
      }`;
    
    const createShader = (type, src) => {
      const s = this.gl.createShader(type);
      this.gl.shaderSource(s, src);
      this.gl.compileShader(s);
      return s;
    };
    
    const p = this.gl.createProgram();
    this.gl.attachShader(p, createShader(this.gl.VERTEX_SHADER, vs));
    this.gl.attachShader(p, createShader(this.gl.FRAGMENT_SHADER, fs));
    this.gl.linkProgram(p);
    this.gl.useProgram(p);
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), this.gl.STATIC_DRAW);
    const al = this.gl.getAttribLocation(p, 'p');
    this.gl.enableVertexAttribArray(al);
    this.gl.vertexAttribPointer(al, 2, this.gl.FLOAT, false, 0, 0);
    
    this.glProgram = p;
  }

  animateWebGL() {
    const frame = () => {
      const time = (performance.now() - this.startTime) * 0.0005;
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
      }

      this.gl.uniform1f(this.gl.getUniformLocation(this.glProgram, 't'), time);
      this.gl.uniform2f(this.gl.getUniformLocation(this.glProgram, 'r'), width, height);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  resizeCanvas2D() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animateCanvas2D() {
    window.addEventListener('resize', () => this.resizeCanvas2D());
    const frame = () => {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const id = this.ctx.createImageData(w, h);
      const d = id.data;
      for(let i=0; i<d.length; i+=4) {
        const v = Math.random() * 255;
        d[i] = v;
        d[i+1] = v;
        d[i+2] = v;
        d[i+3] = 15; // Low opacity
      }
      this.ctx.putImageData(id, 0, 0);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

new NoiseAnimation();

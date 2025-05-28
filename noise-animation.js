/**
 * High-performance animated noise background
 * Uses WebGL for optimal performance with Canvas 2D fallback
 * Includes mobile optimizations and accessibility support
 *
 * Copyright (c) 2025 kthread
 * Licensed under the MIT License - see LICENSE file for details
 *
 * @format
 */

class NoiseAnimation {
	constructor() {
		this.canvas = document.getElementById("noise-canvas");
		this.isWebGPUSupported = false;
		this.isWebGLSupported = false;
		this.renderingMethod = "none";
		this.isAnimating = false;
		this.animationId = null;
		this.lastTime = 0;
		this.noiseScale = 0.8;
		this.timeScale = 0.0005;
		this.opacity = 0.15;

		// Performance and accessibility settings
		this.isMobile = this.detectMobile();
		this.respectsReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		this.isLowPowerMode = this.detectLowPowerMode();

		this.init();
	}

	detectMobile() {
		return (
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent,
			) || window.innerWidth <= 768
		);
	}

	detectLowPowerMode() {
		// Detect low power mode or reduced performance scenarios
		return (
			navigator.hardwareConcurrency <= 2 ||
			(this.isMobile && window.devicePixelRatio > 2)
		);
	}

	async init() {
		if (this.respectsReducedMotion) {
			await this.initRenderingMethod();
			this.renderStaticNoise();
			return;
		}

		this.setupCanvas();
		await this.initRenderingMethod();
		this.setupEventListeners();
		this.start();
	}

	async initRenderingMethod() {
		// Try WebGPU first
		if (await this.initWebGPU()) {
			this.renderingMethod = "webgpu";
			console.log("Using WebGPU rendering");
			return true;
		}

		// Fall back to WebGL
		if (this.initWebGL()) {
			this.renderingMethod = "webgl";
			console.log("Using WebGL rendering");
			return true;
		}

		// Final fallback to Canvas 2D
		if (this.initCanvas2D()) {
			this.renderingMethod = "canvas2d";
			console.log("Using Canvas 2D rendering");
			return true;
		}

		console.error("No rendering method available");
		return false;
	}

	async initWebGPU() {
		try {
			// Check if WebGPU is available
			if (!navigator.gpu) {
				return false;
			}

			// Request adapter
			this.adapter = await navigator.gpu.requestAdapter({
				powerPreference:
					this.isMobile || this.isLowPowerMode
						? "low-power"
						: "high-performance",
			});

			if (!this.adapter) {
				return false;
			}

			// Request device
			this.device = await this.adapter.requestDevice();

			// Get WebGPU context
			this.gpuContext = this.canvas.getContext("webgpu");
			if (!this.gpuContext) {
				return false;
			}

			// Configure the canvas
			const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
			this.gpuContext.configure({
				device: this.device,
				format: canvasFormat,
				alphaMode: "premultiplied",
			});

			// Create shader module
			const shaderCode = `
				struct VertexOutput {
					@builtin(position) position: vec4<f32>,
					@location(0) texCoord: vec2<f32>,
				}

				@vertex
				fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
					var pos = array<vec2<f32>, 4>(
						vec2<f32>(-1.0, -1.0),
						vec2<f32>( 1.0, -1.0),
						vec2<f32>(-1.0,  1.0),
						vec2<f32>( 1.0,  1.0)
					);

					var output: VertexOutput;
					output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
					output.texCoord = (pos[vertexIndex] + 1.0) / 2.0;
					return output;
				}

				struct Uniforms {
					time: f32,
					resolution: vec2<f32>,
					noiseScale: f32,
					// WebGPU struct alignment requires padding to 16-byte boundaries
					// This ensures proper memory layout
				}

				@group(0) @binding(0) var<uniform> uniforms: Uniforms;

				// High-performance noise function for WebGPU
				fn random(st: vec2<f32>) -> f32 {
					return fract(sin(dot(st, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
				}

				fn noise(st: vec2<f32>) -> f32 {
					let i = floor(st);
					let f = fract(st);

					let a = random(i);
					let b = random(i + vec2<f32>(1.0, 0.0));
					let c = random(i + vec2<f32>(0.0, 1.0));
					let d = random(i + vec2<f32>(1.0, 1.0));

					let u = f * f * (3.0 - 2.0 * f);

					return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
				}

				@fragment
				fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
					var st = input.texCoord * uniforms.resolution / min(uniforms.resolution.x, uniforms.resolution.y);
					st = st * uniforms.noiseScale;

					// Animated noise with multiple octaves
					var n = 0.0;
					var amplitude = 1.0;
					var frequency = 1.0;

					// Reduce octaves on mobile for better performance
					let octaves = ${this.isMobile ? 2 : 3};
					for (var i = 0; i < octaves; i = i + 1) {
						n = n + amplitude * noise(st * frequency + uniforms.time * 0.1);
						amplitude = amplitude * 0.5;
						frequency = frequency * 2.0;
					}

					// Subtle noise effect
					let finalNoise = n * 0.1 + 0.02;
					return vec4<f32>(finalNoise, finalNoise, finalNoise, finalNoise);
				}
			`;

			this.shaderModule = this.device.createShaderModule({
				code: shaderCode,
			});

			// Create uniform buffer with proper alignment
			// WebGPU requires 16-byte alignment for struct members
			// Our struct has: time (4), resolution (8), noiseScale (4) = 16 bytes
			// But WebGPU pads to next 16-byte boundary, so we need 32 bytes total
			this.uniformBuffer = this.device.createBuffer({
				size: 32, // Properly aligned size for WebGPU
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			});

			// Create bind group layout
			this.bindGroupLayout = this.device.createBindGroupLayout({
				entries: [
					{
						binding: 0,
						visibility: GPUShaderStage.FRAGMENT,
						buffer: { type: "uniform" },
					},
				],
			});

			// Create bind group
			this.bindGroup = this.device.createBindGroup({
				layout: this.bindGroupLayout,
				entries: [
					{
						binding: 0,
						resource: { buffer: this.uniformBuffer },
					},
				],
			});

			// Create pipeline layout
			this.pipelineLayout = this.device.createPipelineLayout({
				bindGroupLayouts: [this.bindGroupLayout],
			});

			// Create render pipeline
			this.renderPipeline = this.device.createRenderPipeline({
				layout: this.pipelineLayout,
				vertex: {
					module: this.shaderModule,
					entryPoint: "vs_main",
				},
				fragment: {
					module: this.shaderModule,
					entryPoint: "fs_main",
					targets: [
						{
							format: canvasFormat,
							blend: {
								color: {
									srcFactor: "src-alpha",
									dstFactor: "one-minus-src-alpha",
								},
								alpha: {
									srcFactor: "one",
									dstFactor: "one-minus-src-alpha",
								},
							},
						},
					],
				},
				primitive: {
					topology: "triangle-strip",
				},
			});

			this.isWebGPUSupported = true;
			return true;
		} catch (error) {
			console.warn("WebGPU initialization failed:", error);
			return false;
		}
	}

	setupCanvas() {
		this.canvas.style.position = "fixed";
		this.canvas.style.top = "0";
		this.canvas.style.left = "0";
		this.canvas.style.width = "100%";
		this.canvas.style.height = "100%";
		this.canvas.style.zIndex = "-1";
		this.canvas.style.pointerEvents = "none";
		this.canvas.style.opacity = this.opacity;

		this.resize();
	}

	initWebGL() {
		try {
			const gl =
				this.canvas.getContext("webgl2") ||
				this.canvas.getContext("webgl");
			if (!gl) return false;

			this.gl = gl;
			this.isWebGLSupported = true;

			// Vertex shader
			const vertexShaderSource = `
        attribute vec2 a_position;
        varying vec2 v_texCoord;

        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_texCoord = (a_position + 1.0) / 2.0;
        }
      `;

			// Fragment shader with optimized noise function
			const fragmentShaderSource = `
        precision ${this.isMobile ? "mediump" : "highp"} float;

        varying vec2 v_texCoord;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform float u_noiseScale;

        // High-performance noise function
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);

          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));

          vec2 u = f * f * (3.0 - 2.0 * f);

          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
          vec2 st = v_texCoord * u_resolution / min(u_resolution.x, u_resolution.y);
          st *= u_noiseScale;

          // Animated noise with multiple octaves
          float n = 0.0;
          float amplitude = 1.0;
          float frequency = 1.0;

          for (int i = 0; i < ${this.isMobile ? "2" : "3"}; i++) {
            n += amplitude * noise(st * frequency + u_time * 0.1);
            amplitude *= 0.5;
            frequency *= 2.0;
          }

          // Subtle noise effect
          float finalNoise = n * 0.1 + 0.02;
          gl_FragColor = vec4(finalNoise, finalNoise, finalNoise, finalNoise);
        }
      `;

			this.program = this.createShaderProgram(
				gl,
				vertexShaderSource,
				fragmentShaderSource,
			);
			if (!this.program) return false;

			// Set up geometry
			const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

			this.positionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

			// Get uniform locations
			this.uniforms = {
				time: gl.getUniformLocation(this.program, "u_time"),
				resolution: gl.getUniformLocation(this.program, "u_resolution"),
				noiseScale: gl.getUniformLocation(this.program, "u_noiseScale"),
			};

			// Get attribute location
			this.positionLocation = gl.getAttribLocation(
				this.program,
				"a_position",
			);

			return true;
		} catch (e) {
			console.warn(
				"WebGL initialization failed, falling back to Canvas 2D",
			);
			return false;
		}
	}

	createShaderProgram(gl, vertexSource, fragmentSource) {
		const vertexShader = this.createShader(
			gl,
			gl.VERTEX_SHADER,
			vertexSource,
		);
		const fragmentShader = this.createShader(
			gl,
			gl.FRAGMENT_SHADER,
			fragmentSource,
		);

		if (!vertexShader || !fragmentShader) return null;

		const program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error(
				"Program linking failed:",
				gl.getProgramInfoLog(program),
			);
			return null;
		}

		return program;
	}

	createShader(gl, type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(
				"Shader compilation failed:",
				gl.getShaderInfoLog(shader),
			);
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	initCanvas2D() {
		this.ctx = this.canvas.getContext("2d");
		this.imageData = this.ctx.createImageData(
			this.canvas.width,
			this.canvas.height,
		);
		return true;
	}

	renderWebGPU(time) {
		// Update uniforms with proper WebGPU alignment
		// WebGPU struct: { time: f32, resolution: vec2<f32>, noiseScale: f32 }
		// Memory layout: time(4) + pad(4) + resolution.xy(8) + noiseScale(4) + pad(4) = 24 bytes
		const uniformData = new Float32Array(8); // 32 bytes buffer
		uniformData[0] = time * this.timeScale; // time (f32)
		uniformData[1] = 0; // padding to align vec2
		uniformData[2] = this.canvas.width; // resolution.x (vec2<f32>)
		uniformData[3] = this.canvas.height; // resolution.y
		uniformData[4] = this.noiseScale; // noiseScale (f32)
		uniformData[5] = 0; // padding
		uniformData[6] = 0; // padding
		uniformData[7] = 0; // padding

		this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

		// Create command encoder
		const commandEncoder = this.device.createCommandEncoder();

		// Create render pass
		const renderPass = commandEncoder.beginRenderPass({
			colorAttachments: [
				{
					view: this.gpuContext.getCurrentTexture().createView(),
					clearValue: { r: 0, g: 0, b: 0, a: 0 },
					loadOp: "clear",
					storeOp: "store",
				},
			],
		});

		// Set pipeline and bind group
		renderPass.setPipeline(this.renderPipeline);
		renderPass.setBindGroup(0, this.bindGroup);

		// Draw
		renderPass.draw(4);
		renderPass.end();

		// Submit commands
		this.device.queue.submit([commandEncoder.finish()]);
	}

	renderWebGL(time) {
		const gl = this.gl;

		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(this.program);

		// Set uniforms
		gl.uniform1f(this.uniforms.time, time * this.timeScale);
		gl.uniform2f(
			this.uniforms.resolution,
			this.canvas.width,
			this.canvas.height,
		);
		gl.uniform1f(this.uniforms.noiseScale, this.noiseScale);

		// Set up attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.enableVertexAttribArray(this.positionLocation);
		gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

		// Draw
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	renderCanvas2D(time) {
		const { width, height } = this.canvas;
		const data = this.imageData.data;

		// Optimized noise rendering for Canvas 2D
		const step = this.isMobile ? 4 : 2; // Reduce resolution on mobile

		for (let x = 0; x < width; x += step) {
			for (let y = 0; y < height; y += step) {
				const noise = this.simpleNoise(
					x * 0.01,
					y * 0.01,
					time * this.timeScale,
				);
				const value = Math.floor((noise * 0.1 + 0.02) * 255);

				// Fill block for performance
				for (let dx = 0; dx < step && x + dx < width; dx++) {
					for (let dy = 0; dy < step && y + dy < height; dy++) {
						const index = ((y + dy) * width + (x + dx)) * 4;
						data[index] = value; // R
						data[index + 1] = value; // G
						data[index + 2] = value; // B
						data[index + 3] = value; // A
					}
				}
			}
		}

		this.ctx.putImageData(this.imageData, 0, 0);
	}

	simpleNoise(x, y, t) {
		return (Math.sin(x * 12.9898 + y * 78.233 + t * 10) * 43758.5453) % 1;
	}

	renderStaticNoise() {
		// Static noise for users who prefer reduced motion
		if (this.isWebGPUSupported) {
			this.renderWebGPU(0);
		} else if (this.isWebGLSupported) {
			this.renderWebGL(0);
		} else {
			this.renderCanvas2D(0);
		}
	}

	animate(time) {
		if (!this.isAnimating) return;

		// Throttle animation on mobile and low-power devices
		const targetFPS = this.isMobile || this.isLowPowerMode ? 30 : 60;
		const interval = 1000 / targetFPS;

		if (time - this.lastTime >= interval) {
			switch (this.renderingMethod) {
				case "webgpu":
					this.renderWebGPU(time);
					break;
				case "webgl":
					this.renderWebGL(time);
					break;
				case "canvas2d":
					this.renderCanvas2D(time);
					break;
			}
			this.lastTime = time;
		}

		this.animationId = requestAnimationFrame((t) => this.animate(t));
	}

	resize() {
		const dpr = Math.min(
			window.devicePixelRatio || 1,
			this.isMobile ? 2 : 3,
		);
		const rect = this.canvas.getBoundingClientRect();

		this.canvas.width = rect.width * dpr;
		this.canvas.height = rect.height * dpr;
		this.canvas.style.width = rect.width + "px";
		this.canvas.style.height = rect.height + "px";

		// Handle Canvas 2D context scaling
		if (this.ctx) {
			this.ctx.scale(dpr, dpr);
			this.imageData = this.ctx.createImageData(
				this.canvas.width,
				this.canvas.height,
			);
		}

		// WebGPU context automatically handles resize
		// WebGL context automatically handles resize through viewport calls
	}

	setupEventListeners() {
		window.addEventListener("resize", () => {
			this.resize();
		});

		// Pause animation when page is not visible
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) {
				this.stop();
			} else {
				this.start();
			}
		});

		// Listen for reduced motion changes
		window
			.matchMedia("(prefers-reduced-motion: reduce)")
			.addEventListener("change", (e) => {
				this.respectsReducedMotion = e.matches;
				if (e.matches) {
					this.stop();
					this.renderStaticNoise();
				} else {
					this.start();
				}
			});

		// Battery API for power management
		if ("getBattery" in navigator) {
			navigator.getBattery().then((battery) => {
				const updatePowerMode = () => {
					this.isLowPowerMode =
						battery.level < 0.2 || !battery.charging;
				};

				battery.addEventListener("levelchange", updatePowerMode);
				battery.addEventListener("chargingchange", updatePowerMode);
				updatePowerMode();
			});
		}
	}

	start() {
		if (this.respectsReducedMotion) {
			this.renderStaticNoise();
			return;
		}

		this.isAnimating = true;
		this.animate(performance.now());
	}

	stop() {
		this.isAnimating = false;
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}

	destroy() {
		this.stop();

		// Clean up WebGPU resources
		if (this.isWebGPUSupported && this.device) {
			if (this.uniformBuffer) {
				this.uniformBuffer.destroy();
			}
			// Note: Other WebGPU resources are automatically cleaned up when device is destroyed
		}

		// Clean up WebGL resources
		if (this.gl && this.program) {
			this.gl.deleteProgram(this.program);
		}

		if (this.positionBuffer) {
			this.gl.deleteBuffer(this.positionBuffer);
		}
	}
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", async () => {
		window.noiseAnimation = new NoiseAnimation();
	});
} else {
	window.noiseAnimation = new NoiseAnimation();
}

// Clean up on page unload
window.addEventListener("beforeunload", () => {
	if (window.noiseAnimation) {
		window.noiseAnimation.destroy();
	}
});

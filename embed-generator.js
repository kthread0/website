/** @format */

class EmbedGenerator {
	constructor() {
		this.siteData = this.extractSiteData();
		this.canvas = null;
		this.ctx = null;
		this.init();
	}

	extractSiteData() {
		const heroTitle =
			document.querySelector(".hero-title")?.textContent?.trim() ||
			"kthread - developer";
		const heroDescription =
			document.querySelector(".hero-description")?.textContent?.trim() ||
			"specializing in software development and cybersecurity";
		const skills = Array.from(document.querySelectorAll(".skill")).map(
			(skill) => skill.textContent.replace("- ", "").trim(),
		);
		const projectCount = document.querySelectorAll(".project-card").length;
		const email =
			document.querySelector('a[href^="mailto:"]')?.textContent?.trim() ||
			"dev@fault.wtf";
		const github =
			document.querySelector('a[href*="github.com"]')?.href ||
			"https://github.com/kthread0";

		return {
			title: heroTitle,
			description: heroDescription,
			skills: skills,
			projectCount: projectCount,
			email: email,
			github: github,
			siteUrl: window.location.origin || "https://kthread.dev",
			timestamp: new Date().toISOString(),
		};
	}

	async init() {
		this.updateMetaTags();
		await this.generateEmbedImage();
		this.setupEmbedPreview();
	}

	updateMetaTags() {
		const data = this.siteData;

		document
			.querySelector('meta[property="og:title"]')
			?.setAttribute("content", data.title);
		document
			.querySelector('meta[property="og:description"]')
			?.setAttribute("content", this.createOGDescription());
		document
			.querySelector('meta[property="og:url"]')
			?.setAttribute("content", data.siteUrl);
		document
			.querySelector('meta[name="description"]')
			?.setAttribute("content", this.createOGDescription());

		document
			.querySelector('meta[name="twitter:title"]')
			?.setAttribute("content", data.title);
		document
			.querySelector('meta[name="twitter:description"]')
			?.setAttribute("content", this.createTwitterDescription());

		document.title = data.title;
	}

	createOGDescription() {
		const { skills, projectCount } = this.siteData;
		const skillsText = skills.slice(0, 4).join(", ");
		return `Computer science student specializing in software development and cybersecurity. Experienced in ${skillsText}. ${projectCount} projects available.`;
	}

	createTwitterDescription() {
		const { skills } = this.siteData;
		const topSkills = skills.slice(0, 3).join(", ");
		return `Developer working with ${topSkills} and more. Check out my projects and get in touch.`;
	}

	async generateEmbedImage() {
		this.canvas = document.createElement("canvas");
		this.canvas.width = 1200;
		this.canvas.height = 630;
		this.ctx = this.canvas.getContext("2d");

		await this.drawBackground();
		this.drawContent();
		this.generateImageBlob();
	}

	async drawBackground() {
		const { ctx, canvas } = this;

		ctx.fillStyle = "#0a0a0a";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		this.drawNoise();
		this.drawGrid();
		this.drawAccentElements();
	}

	drawNoise() {
		const { ctx, canvas } = this;
		const imageData = ctx.createImageData(canvas.width, canvas.height);
		const data = imageData.data;

		for (let i = 0; i < data.length; i += 4) {
			const noise = Math.random() * 0.1;
			const value = Math.floor(noise * 255);
			data[i] = value;
			data[i + 1] = value;
			data[i + 2] = value;
			data[i + 3] = 8;
		}

		ctx.putImageData(imageData, 0, 0);
	}

	drawGrid() {
		const { ctx, canvas } = this;

		ctx.strokeStyle = "#1a1a1a";
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.3;

		const gridSize = 40;

		for (let x = 0; x < canvas.width; x += gridSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
		}

		for (let y = 0; y < canvas.height; y += gridSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(canvas.width, y);
			ctx.stroke();
		}

		ctx.globalAlpha = 1;
	}

	drawAccentElements() {
		const { ctx } = this;

		ctx.strokeStyle = "#00ff41";
		ctx.lineWidth = 2;
		ctx.globalAlpha = 0.6;

		ctx.beginPath();
		ctx.rect(50, 50, 200, 2);
		ctx.stroke();

		ctx.beginPath();
		ctx.rect(50, 50, 2, 100);
		ctx.stroke();

		ctx.beginPath();
		ctx.rect(950, 530, 200, 2);
		ctx.stroke();

		ctx.beginPath();
		ctx.rect(1148, 430, 2, 100);
		ctx.stroke();

		ctx.globalAlpha = 1;
	}

	drawContent() {
		const { ctx } = this;
		const { title, skills, projectCount, github } = this.siteData;

		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 72px JetBrains Mono, monospace";
		ctx.textAlign = "left";
		ctx.fillText(title, 80, 200);

		ctx.fillStyle = "#888888";
		ctx.font = "36px JetBrains Mono, monospace";
		ctx.fillText("computer science student", 80, 260);
		ctx.fillText("software development & cybersecurity", 80, 310);

		ctx.fillStyle = "#00ff41";
		ctx.font = "28px JetBrains Mono, monospace";
		ctx.fillText("> skills:", 80, 380);

		ctx.fillStyle = "#ffffff";
		ctx.font = "24px JetBrains Mono, monospace";
		const skillsText = skills.slice(0, 6).join(" • ");
		this.wrapText(skillsText, 80, 420, 1000, 35);

		ctx.fillStyle = "#888888";
		ctx.font = "20px JetBrains Mono, monospace";
		ctx.fillText(`${projectCount} projects available`, 80, 520);

		const githubUser = github.split("/").pop();
		ctx.fillText(`github.com/${githubUser}`, 80, 550);

		this.drawTerminalCursor(
			80 + ctx.measureText(`github.com/${githubUser}`).width + 10,
			550,
		);
	}

	wrapText(text, x, y, maxWidth, lineHeight) {
		const { ctx } = this;
		const words = text.split(" ");
		let line = "";
		let currentY = y;

		for (let n = 0; n < words.length; n++) {
			const testLine = line + words[n] + " ";
			const metrics = ctx.measureText(testLine);
			const testWidth = metrics.width;

			if (testWidth > maxWidth && n > 0) {
				ctx.fillText(line, x, currentY);
				line = words[n] + " ";
				currentY += lineHeight;
			} else {
				line = testLine;
			}
		}
		ctx.fillText(line, x, currentY);
	}

	drawTerminalCursor(x, y) {
		const { ctx } = this;
		ctx.fillStyle = "#00ff41";
		ctx.fillRect(x, y - 18, 12, 20);

		setTimeout(() => {
			ctx.fillStyle = "#0a0a0a";
			ctx.fillRect(x, y - 18, 12, 20);
		}, 500);
	}

	generateImageBlob() {
		this.canvas.toBlob(
			(blob) => {
				const url = URL.createObjectURL(blob);

				document
					.querySelector('meta[property="og:image"]')
					?.setAttribute("content", url);
				document
					.querySelector('meta[name="twitter:image"]')
					?.setAttribute("content", url);

				this.embedImageUrl = url;
				this.embedImageBlob = blob;
			},
			"image/png",
			0.9,
		);
	}

	setupEmbedPreview() {
		// Preview embed feature removed
	}

	// Preview embed feature removed - all methods below this line removed

	refresh() {
		this.siteData = this.extractSiteData();
		this.updateMetaTags();
		this.generateEmbedImage();
	}
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		window.embedGenerator = new EmbedGenerator();
	});
} else {
	window.embedGenerator = new EmbedGenerator();
}

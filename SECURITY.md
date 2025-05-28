# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

This is a personal website project that follows modern web security practices.

## Security Features

### Client-Side Security

- **Content Security Policy**: Implemented via meta tags and headers
- **XSS Protection**: All user-facing content is properly sanitized
- **HTTPS Only**: Website enforces HTTPS connections
- **Secure Headers**: Implements security headers for enhanced protection

### WebGL/WebGPU Security

- **Resource Management**: Proper cleanup of GPU resources to prevent memory leaks
- **Shader Validation**: All shaders are validated before compilation
- **Context Isolation**: Graphics contexts are properly isolated
- **Error Handling**: Graceful fallbacks for unsupported features

### Build Pipeline Security

- **Dependency Management**: Regular dependency updates via GitHub Actions
- **Automated Scanning**: Dependencies are scanned for known vulnerabilities
- **Secure Workflows**: GitHub Actions workflows follow security best practices
- **Permission Scoping**: Minimal required permissions for all workflows

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

1. **Email**: Send details to `dev@fault.wtf`
2. **Subject**: Use "SECURITY: [Brief Description]" as the subject line
3. **Do NOT**: Create public issues for security vulnerabilities

### What to Include

Please include the following information in your report:

- **Description**: Clear description of the vulnerability
- **Impact**: Potential impact and attack scenarios
- **Reproduction**: Step-by-step instructions to reproduce the issue
- **Environment**: Browser, OS, and any relevant system information
- **Screenshots/Videos**: If applicable and helpful

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 7 days for impact evaluation
- **Resolution**: Timeline depends on severity and complexity
- **Disclosure**: Coordinated disclosure after fix is deployed

### Severity Levels

We classify vulnerabilities using the following levels:

#### Critical

- Remote code execution
- Authentication bypass
- Data breach potential

#### High

- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Privilege escalation

#### Medium

- Information disclosure
- Denial of service
- Logic flaws

#### Low

- Configuration issues
- Minor information leaks
- UI/UX security concerns

## Security Best Practices

### For Contributors

If you're contributing to this project, please follow these security guidelines:

- **Dependencies**: Only add necessary dependencies from trusted sources
- **Code Review**: All changes require security-focused code review
- **Testing**: Include security tests for new features
- **Documentation**: Document any security implications of changes

### For Users

If you're hosting or modifying this website:

- **HTTPS**: Always serve the website over HTTPS
- **Headers**: Implement proper security headers
- **Updates**: Keep dependencies updated
- **Monitoring**: Monitor for security advisories

## Known Security Considerations

### WebGL/WebGPU

- GPU memory limitations on mobile devices
- Potential for GPU-based fingerprinting
- Shader compilation security in older browsers

### Client-Side Rendering

- All rendering happens client-side
- No server-side data processing
- Static file hosting security model

### Third-Party Dependencies

- Google Fonts loaded with proper CORS settings
- GitHub Pages hosting security model
- Minimal external dependencies

## Security Headers

The following security headers should be implemented by your hosting provider:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Automated Security

### GitHub Actions

- **Dependency scanning**: Automated vulnerability scanning
- **CodeQL analysis**: Static code analysis for security issues
- **Supply chain security**: Verification of dependencies

### Browser Security

- **Feature detection**: Graceful degradation for unsupported features
- **Memory management**: Proper cleanup of resources
- **Error boundaries**: Secure error handling

## Contact

For security-related questions or concerns:

- **Primary Contact**: <dev@fault.wtf>
- **GitHub**: [@kthread0](https://github.com/kthread0)

## License

This security policy is part of the project licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Note**: This is a personal website project. While we strive to follow security best practices, users should evaluate their own security requirements when using or modifying this code.

import "../styles/About.css";

function About() {
  return (
    <div className="about-container">
      <div className="about-header">
        <div className="about-logo">🔐</div>
        <h1>2Pass 密码管理器</h1>
        <p className="version">版本 1.1.0</p>
      </div>

      <div className="about-content">
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>AES-256-GCM 加密</h3>
            <p>军事级加密算法保护你的数据</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔑</div>
            <h3>Argon2 密钥派生</h3>
            <p>抗暴力破解的密码哈希</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h3>TOTP 支持</h3>
            <p>兼容 Google Authenticator</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💾</div>
            <h3>本地存储</h3>
            <p>数据仅保存在本地，不会上传</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎲</div>
            <h3>密码生成器</h3>
            <p>生成安全的随机密码</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>智能搜索</h3>
            <p>快速找到你需要的密码</p>
          </div>
        </div>

        <div className="security-info">
          <h2>🔐 安全说明</h2>
          <ul>
            <li>所有密码使用 AES-256-GCM 加密存储</li>
            <li>主密码使用 Argon2id 哈希</li>
            <li>TOTP 密钥随密码一起加密</li>
            <li>数据仅保存在本地，不会联网</li>
            <li>开源透明，代码可审计</li>
          </ul>
        </div>

        <div className="footer-info">
          <p>© 2025 2Pass. 使用 ❤️ 和 Rust 构建</p>
          <p className="license">MIT License</p>
        </div>
      </div>
    </div>
  );
}

export default About;


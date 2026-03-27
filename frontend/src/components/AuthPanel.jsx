const AuthPanel = ({ user, loginForm, registerForm, onLoginChange, onRegisterChange, onLogin, onRegister, onLogout }) => (
  <article className="panel auth-panel">
    <h3>Session</h3>
    {user ? (
      <div className="stack gap-sm">
        <strong>{user.fullName}</strong>
        <span className="muted">{user.email}</span>
        <span className="muted">Roles: {(user.roles || []).map((role) => role.name).join(', ') || 'n/a'}</span>
        <button onClick={onLogout}>Dang xuat</button>
      </div>
    ) : (
      <div className="stack gap-md">
        <form className="stack gap-sm" onSubmit={onLogin}>
          <input value={loginForm.identifier} onChange={(event) => onLoginChange('identifier', event.target.value)} placeholder="Email hoac username" />
          <input type="password" value={loginForm.password} onChange={(event) => onLoginChange('password', event.target.value)} placeholder="Mat khau" />
          <button type="submit">Dang nhap</button>
        </form>
        <form className="stack gap-sm" onSubmit={onRegister}>
          <input value={registerForm.username} onChange={(event) => onRegisterChange('username', event.target.value)} placeholder="Username" />
          <input value={registerForm.email} onChange={(event) => onRegisterChange('email', event.target.value)} placeholder="Email" />
          <input value={registerForm.fullName} onChange={(event) => onRegisterChange('fullName', event.target.value)} placeholder="Ho ten" />
          <input value={registerForm.phone} onChange={(event) => onRegisterChange('phone', event.target.value)} placeholder="So dien thoai" />
          <input type="password" value={registerForm.password} onChange={(event) => onRegisterChange('password', event.target.value)} placeholder="Mat khau" />
          <button type="submit">Dang ky</button>
        </form>
      </div>
    )}
  </article>
);

export default AuthPanel;

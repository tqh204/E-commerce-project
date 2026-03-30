import SectionCard from '../../shared/SectionCard';
import PasswordField from './PasswordField';

const LoginPage = ({
  loginForm,
  rememberAccount,
  setLoginForm,
  setRememberAccount,
  showPassword,
  setShowPassword,
  onSubmit,
}) => (
  <SectionCard title="Đăng nhập" subtitle="Auth / Login" className="wide">
    <form className="stack gap-sm auth-single" onSubmit={onSubmit}>
      <input
        value={loginForm.identifier}
        onChange={(event) =>
          setLoginForm((current) => ({ ...current, identifier: event.target.value }))
        }
        placeholder="Email hoặc username"
        autoComplete="username"
      />
      <PasswordField
        value={loginForm.password}
        onChange={(event) =>
          setLoginForm((current) => ({ ...current, password: event.target.value }))
        }
        placeholder="Mật khẩu"
        visible={showPassword}
        onToggle={() => setShowPassword((current) => !current)}
      />
      <label className="checkbox-row auth-checkbox">
        <input
          type="checkbox"
          checked={rememberAccount}
          onChange={(event) => setRememberAccount(event.target.checked)}
        />
        <span>Lưu tài khoản để lần sau tự điền lại</span>
      </label>
      <button type="submit">Đăng nhập</button>
    </form>
  </SectionCard>
);

export default LoginPage;

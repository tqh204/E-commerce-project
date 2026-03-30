import SectionCard from '../../shared/SectionCard';
import PasswordField from './PasswordField';

const RegisterPage = ({
  registerForm,
  setRegisterForm,
  showConfirmPassword,
  showPassword,
  setShowConfirmPassword,
  setShowPassword,
  onSubmit,
}) => (
  <SectionCard title="Đăng ký" subtitle="Auth / Register" className="wide">
    <form className="stack gap-sm auth-single" onSubmit={onSubmit}>
      <input
        value={registerForm.username}
        onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value }))}
        placeholder="Username"
        autoComplete="username"
      />
      <input
        value={registerForm.email}
        onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
        placeholder="Email"
        autoComplete="email"
      />
      <input
        value={registerForm.fullName}
        onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))}
        placeholder="Họ và tên"
        autoComplete="name"
      />
      <input
        value={registerForm.phone}
        onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
        placeholder="Số điện thoại"
        autoComplete="tel"
      />
      <select
        value={registerForm.roles?.includes('seller') ? 'seller' : 'buyer'}
        onChange={(event) =>
          setRegisterForm((current) => ({
            ...current,
            roles: [event.target.value],
          }))
        }
      >
        <option value="buyer">Tài khoản người mua</option>
        <option value="seller">Tài khoản người bán</option>
      </select>
      <PasswordField
        value={registerForm.password}
        onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
        placeholder="Mật khẩu"
        visible={showPassword}
        onToggle={() => setShowPassword((current) => !current)}
        autoComplete="new-password"
      />
      <PasswordField
        value={registerForm.confirmPassword || ''}
        onChange={(event) =>
          setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))
        }
        placeholder="Nhập lại mật khẩu"
        visible={showConfirmPassword}
        onToggle={() => setShowConfirmPassword((current) => !current)}
        autoComplete="new-password"
      />
      <p className="muted auth-note">
        Mật khẩu cần có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
      </p>
      <p className="muted auth-note">
        Username nên dùng chữ, số, dấu gạch dưới hoặc gạch ngang.
      </p>
      <button type="submit">Đăng ký</button>
    </form>
  </SectionCard>
);

export default RegisterPage;

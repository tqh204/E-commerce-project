import SectionCard from '../../shared/SectionCard';

const LoginPage = ({ loginForm, setLoginForm, onSubmit }) => (
  <SectionCard title="Dang nhap" subtitle="Auth / Login" className="wide">
    <form className="stack gap-sm auth-single" onSubmit={onSubmit}>
      <input value={loginForm.identifier} onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))} placeholder="Email hoac username" />
      <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" />
      <button type="submit">Dang nhap</button>
    </form>
  </SectionCard>
);

export default LoginPage;

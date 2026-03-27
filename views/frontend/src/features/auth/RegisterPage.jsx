import SectionCard from '../../shared/SectionCard';

const RegisterPage = ({ registerForm, setRegisterForm, onSubmit }) => (
  <SectionCard title="Dang ky" subtitle="Auth / Register" className="wide">
    <form className="stack gap-sm auth-single" onSubmit={onSubmit}>
      <input value={registerForm.username} onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value }))} placeholder="Username" />
      <input value={registerForm.email} onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
      <input value={registerForm.fullName} onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Ho va ten" />
      <input value={registerForm.phone} onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))} placeholder="So dien thoai" />
      <input type="password" value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" />
      <button type="submit">Dang ky</button>
    </form>
  </SectionCard>
);

export default RegisterPage;

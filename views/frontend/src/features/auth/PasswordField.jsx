const PasswordField = ({
  autoComplete = 'current-password',
  onChange,
  onToggle,
  placeholder,
  value,
  visible,
}) => (
  <div className="password-field">
    <input
      className="password-field__input"
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
    />
    <button
      type="button"
      className="password-toggle"
      onClick={onToggle}
      aria-label={visible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
    >
      {visible ? 'Ẩn' : 'Hiện'}
    </button>
  </div>
);

export default PasswordField;

import { navigateTo } from '@frontend-utils/router';

const AppLink = ({ to, className = '', children }) => (
  <a
    href={to}
    className={className}
    onClick={(event) => {
      event.preventDefault();
      navigateTo(to);
    }}
  >
    {children}
  </a>
);

export default AppLink;

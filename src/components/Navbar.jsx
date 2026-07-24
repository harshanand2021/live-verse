import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import "./styles/Navbar.css";
import Button from './Button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/rooms">
          <Logo size="md" />
        </Link>

        <nav className="navbar__links">
          <Link to="/rooms" className="navbar__link">All Rooms</Link>
          <Link to="/host/new" className="navbar__link">Host a Room</Link>
        </nav>

        {user ? (
          <div className="navbar__user">
            <span className="navbar__avatar" style={{ background: user.avatarColor }}>
              {user.name.charAt(0)}
            </span>
            <span className="navbar__name">{user.name}</span>
            <Button variant="text" size="sm" onClick={handleLogout}>Log out</Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
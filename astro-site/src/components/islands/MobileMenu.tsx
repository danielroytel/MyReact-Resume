import { useState, useRef, useEffect } from 'react';
import { useOnClickOutside } from '@hooks/useOnClickOutside';
import { KEY_CODES } from '@utils';

interface Props {
  navLinks: { name: string; url: string }[];
  resumeHref: string;
}

const MobileMenu = ({ navLinks, resumeHref }: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(o => !o);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  let menuFocusables: HTMLElement[] = [];
  let firstFocusableEl: HTMLElement | null = null;
  let lastFocusableEl: HTMLElement | null = null;

  const setFocusables = () => {
    if (!buttonRef.current || !navRef.current) return;
    menuFocusables = [buttonRef.current, ...Array.from(navRef.current.querySelectorAll('a'))];
    firstFocusableEl = menuFocusables[0] ?? null;
    lastFocusableEl = menuFocusables[menuFocusables.length - 1] ?? null;
  };

  const handleBackwardTab = (e: KeyboardEvent) => {
    if (document.activeElement === firstFocusableEl && lastFocusableEl) {
      e.preventDefault();
      lastFocusableEl.focus();
    }
  };

  const handleForwardTab = (e: KeyboardEvent) => {
    if (document.activeElement === lastFocusableEl && firstFocusableEl) {
      e.preventDefault();
      firstFocusableEl.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case KEY_CODES.ESCAPE:
      case KEY_CODES.ESCAPE_IE11: {
        setMenuOpen(false);
        break;
      }
      case KEY_CODES.TAB: {
        if (menuFocusables && menuFocusables.length === 1) {
          e.preventDefault();
          break;
        }
        if (e.shiftKey) handleBackwardTab(e);
        else handleForwardTab(e);
        break;
      }
      default:
        break;
    }
  };

  const onResize = (e: UIEvent) => {
    if (e.currentTarget && (e.currentTarget as Window).innerWidth > 768) {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    setFocusables();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (menuOpen) document.body.classList.add('blur');
    else document.body.classList.remove('blur');
  }, [menuOpen]);

  useOnClickOutside(wrapperRef, () => setMenuOpen(false));

  return (
    <div className="menu-root">
      <div ref={wrapperRef}>
        <button
          ref={buttonRef}
          className={`hamburger-button${menuOpen ? ' is-open' : ''}`}
          onClick={toggleMenu}
          aria-label="Menu"
          aria-expanded={menuOpen}>
          <div className="ham-box">
            <div className="ham-box-inner" />
          </div>
        </button>

        <aside
          ref={navRef}
          className={`sidebar${menuOpen ? ' is-open' : ''}`}
          aria-hidden={!menuOpen}
          tabIndex={menuOpen ? 1 : -1}>
          <nav className="sidebar-nav">
            <ol>
              {navLinks.map(({ url, name }) => (
                <li key={url}>
                  <a href={url} onClick={() => setMenuOpen(false)}>
                    {name}
                  </a>
                </li>
              ))}
            </ol>
            <a href={resumeHref} className="button-big resume-link" onClick={() => setMenuOpen(false)}>
              Resume
            </a>
          </nav>
        </aside>
      </div>
    </div>
  );
};

export default MobileMenu;

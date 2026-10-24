import React, { createContext, useContext, useState, useEffect } from 'react';

const RouterContext = createContext(null);

function getPathFromHash() {
  const hash = window.location.hash.slice(1); // strip leading '#'
  if (!hash || hash === '') return '/';
  const questionIndex = hash.indexOf('?');
  return questionIndex === -1 ? hash : hash.slice(0, questionIndex);
}

function getQueryFromHash() {
  const hash = window.location.hash.slice(1);
  const questionIndex = hash.indexOf('?');
  if (questionIndex === -1) return new URLSearchParams();
  return new URLSearchParams(hash.slice(questionIndex + 1));
}

export function RouterProvider({ children }) {
  const [currentPath, setCurrentPath] = useState(getPathFromHash());
  const [query, setQuery] = useState(getQueryFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getPathFromHash());
      setQuery(getQueryFromHash());
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path) => {
    const target = path.startsWith('/') ? path : `/${path}`;
    window.location.hash = target;
  };

  return (
    <RouterContext.Provider value={{ currentPath, query, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}

export function Link({ to, children, className = '', activeClassName = '', ...props }) {
  const { currentPath, navigate } = useRouter();
  const isActive = currentPath === to;
  const combinedClass = `${className} ${isActive ? activeClassName : ''}`.trim();

  const handleClick = (e) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <a href={`#${to}`} onClick={handleClick} className={combinedClass} {...props}>
      {children}
    </a>
  );
}

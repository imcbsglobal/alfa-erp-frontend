import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedAccess = localStorage.getItem("access_token");
    const storedRefresh = localStorage.getItem("refresh_token");
    const storedMenus = localStorage.getItem("menus");

    if (storedUser && storedAccess && storedRefresh) {
      setUser(JSON.parse(storedUser));
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
      if (storedMenus) {
        setMenus(JSON.parse(storedMenus));
      }
    }
    setLoading(false);
  }, []);

  const setUserSession = (userData, access, refresh, menus) => {
    setUser(userData);
    setAccessToken(access);
    setRefreshToken(refresh);
    setMenus(menus || []);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    localStorage.setItem("menus", JSON.stringify(menus || []));
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setMenus([]);
    window.location.href = "/login";
  };

  const value = {
    user,
    menus,
    accessToken,
    refreshToken,
    loading,
    isAuthenticated: !!user,
    setUserSession,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

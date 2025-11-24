import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

const resolveBackendUrl = () => {
    const envUrl = import.meta.env.VITE_BACKEND_URL;

    if (envUrl && envUrl.trim().length > 0) {
        return envUrl.trim().replace(/\/$/, "");
    }

    if (typeof window !== "undefined" && window.location?.origin) {
        return window.location.origin;
    }

    return "http://localhost:3000";
};

const BACKEND_URL = resolveBackendUrl();

const buildApiUrl = (path) => {
    if (!path.startsWith("/")) {
        return `${BACKEND_URL}/${path}`;
    }

    return `${BACKEND_URL}${path}`;
};

/*
 * This provider should export a `user` context state that is 
 * set (to non-null) when:
 *     1. a hard reload happens while a user is logged in.
 *     2. the user just logged in.
 * `user` should be set to null when:
 *     1. a hard reload happens when no users are logged in.
 *     2. the user just logged out.
 */
export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const getStoredToken = () => localStorage.getItem("token");

    const fetchCurrentUser = async (token) => {
        const response = await fetch(buildApiUrl("/user/me"), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.message || "Failed to fetch user");
        }

        const data = await response.json();
        return data.user;
    };

    useEffect(() => {
        const token = getStoredToken();
        if (!token) {
            setUser(null);
            return;
        }

        let isSubscribed = true;

        fetchCurrentUser(token)
            .then((currentUser) => {
                if (isSubscribed) {
                    setUser(currentUser);
                }
            })
            .catch(() => {
                if (isSubscribed) {
                    localStorage.removeItem("token");
                    setUser(null);
                }
            });

        return () => {
            isSubscribed = false;
        };
    }, []);

    /*
     * Logout the currently authenticated user.
     *
     * @remarks This function will always navigate to "/".
     */
    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);

        navigate("/");
    };

    /**
     * Login a user with their credentials.
     *
     * @remarks Upon success, navigates to "/profile". 
     * @param {string} username - The username of the user.
     * @param {string} password - The password of the user.
     * @returns {string} - Upon failure, Returns an error message.
     */
    const login = async (username, password) => {
        try {
            const response = await fetch(buildApiUrl("/login"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                return errorBody.message || "Failed to login";
            }

            const data = await response.json();
            const token = data.token;
            localStorage.setItem("token", token);

            const currentUser = await fetchCurrentUser(token);
            setUser(currentUser);
            navigate("/profile");
            return "";
        } catch (error) {
            return error.message || "Failed to login";
        }
    };

    /**
     * Registers a new user. 
     * 
     * @remarks Upon success, navigates to "/".
     * @param {Object} userData - The data of the user to register.
     * @returns {string} - Upon failure, returns an error message.
     */
    const register = async (userData) => {
        try {
            const response = await fetch(buildApiUrl("/register"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                return errorBody.message || "Failed to register";
            }

            navigate("/success");
            return "";
        } catch (error) {
            return error.message || "Failed to register";
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};

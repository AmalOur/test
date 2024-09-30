import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';

axios.defaults.withCredentials = true;

const Login = ({ setIsAuthenticated }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [signupData, setSignupData] = useState({ username: '', firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState({ login: false, signup: false });
    const [showPassword, setShowPassword] = useState({ login: false, signup: false, confirmSignup: false });
    const [accountCreated, setAccountCreated] = useState(false);
    const navigate = useNavigate();

    const handleLoginChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    const handleSignupChange = (e) => {
        setSignupData({ ...signupData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const buttonType = isLogin ? 'login' : 'signup';
        setIsLoading({ ...isLoading, [buttonType]: true });
        setError('');
        setAccountCreated(false);

        const data = isLogin ? loginData : signupData;

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!isLogin) {
            if (!passwordRegex.test(data.password)) {
                setError('Password must be at least 8 characters long and include 1 lowercase, 1 uppercase, 1 special character, and 1 number.');
                setIsLoading({ ...isLoading, signup: false });
                return;
            }

            if (data.password !== data.confirmPassword) {
                setError('Passwords do not match.');
                setIsLoading({ ...isLoading, signup: false });
                return;
            }
        }

        try {
            const endpoint = isLogin ? '/api/login' : '/api/signup';
            const response = await axios.post(endpoint, data);

            if (isLogin && response.data.authenticated) {
                setIsAuthenticated(true);
                localStorage.setItem('token', response.data.token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
                navigate('/chat');
            } else if (!isLogin && response.data.success) {
                setIsLogin(true);
                setError('');
                setAccountCreated(true);
            } else {
                setError('An error occurred. Please try again.');
            }
        } catch (error) {
            setError(error.response?.data?.error || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading({ ...isLoading, [buttonType]: false });
        }
    };

    const toggleShowPassword = (field) => {
        setShowPassword({ ...showPassword, [field]: !showPassword[field] });
    };

    const inputClasses = "w-full pl-10 pr-3 py-3 bg-white bg-opacity-10 text-white rounded-md focus:outline-none transition-all duration-300 border border-gray-600";
    const activeInputClasses = "focus:ring-2 focus:ring-opacity-50 focus:border-white";
    const buttonClasses = "w-full py-3 px-4 rounded-md transition-all duration-300 flex items-center justify-center font-semibold text-white bg-darkgreen-600 hover:bg-darkgreen-700 focus:outline-none focus:ring-2 focus:ring-darkgreen-500 focus:ring-opacity-50";

    const containerVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, y: -50, transition: { duration: 0.5 } }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center" style={{ backgroundImage: "url('/image/bglia.png')" }}>
            <div className="absolute inset-0 bg-black opacity-30"></div>
            <Link to="/" className="absolute top-4 left-4 text-white hover:text-darkgreen-300 transition-colors duration-200 z-10">
                <ArrowLeft size={24} />
            </Link>
            <div className="w-full max-w-md relative z-10">
                <AnimatePresence mode="wait">
                    {isLogin ? (
                        <motion.div
                            key="login"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-darkgreen-800 bg-opacity-50 p-10 rounded-lg shadow-2xl backdrop-blur-md border border-gray-600"
                        >
                            <h2 className="text-3xl font-bold text-white mb-8 text-center">Bon Retour</h2>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-600 bg-opacity-80 text-white p-4 rounded-md mb-6 flex items-center"
                                >
                                    <AlertCircle className="mr-2" size={20} />
                                    <p>{error}</p>
                                </motion.div>
                            )}
                            {accountCreated && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-green-600 bg-opacity-80 text-white p-4 rounded-md mb-6 flex items-center"
                                >
                                    <p>Compte créé avec succès. Veuillez vous connecter.</p>
                                </motion.div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="relative">
                                    <User className="absolute top-3 left-3 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        name="username"
                                        value={loginData.username}
                                        onChange={handleLoginChange}
                                        className={`${inputClasses} ${activeInputClasses}`}
                                        placeholder="Nom d'utilisateur"
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute top-3 left-3 text-gray-400" size={20} />
                                    <input
                                        type={showPassword.login ? "text" : "password"}
                                        name="password"
                                        value={loginData.password}
                                        onChange={handleLoginChange}
                                        className={`${inputClasses} ${activeInputClasses}`}
                                        placeholder="Mot de Passe"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute top-3 right-3 text-gray-400"
                                        onClick={() => toggleShowPassword('login')}
                                    >
                                        {showPassword.login ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <motion.button
                                    type="submit"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`${buttonClasses} border border-gray-600`}
                                    disabled={isLoading.login}
                                >
                                    {isLoading.login ? (
                                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : 'Se Connecter'}
                                </motion.button>
                            </form>
                            <p className="mt-8 text-center text-gray-300">
                                Vous n'avez pas de compte ?{' '}
                                <button onClick={() => setIsLogin(false)} className="text-white hover:text-darkgreen-300 transition-colors duration-300 font-semibold underline">
                                    S'inscrire
                                </button>
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="signup"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="bg-darkgreen-800 bg-opacity-50 p-10 rounded-lg shadow-2xl backdrop-blur-md border border-gray-600"
                        >
                            <h2 className="text-3xl font-bold text-white mb-8 text-center">Créer un Compte</h2>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-600 bg-opacity-80 text-white p-4 rounded-md mb-6 flex items-center"
                                >
                                    <AlertCircle className="mr-2" size={20} />
                                    <p>{error}</p>
                                </motion.div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="relative">
                                    <User className="absolute top-3 left-3 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        name="username"
                                        value={signupData.username}
                                        onChange={handleSignupChange}
                                        className={`${inputClasses} ${activeInputClasses}`}
                                        placeholder="Nom d'utilisateur"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <User className="absolute top-3 left-3 text-gray-400" size={20} />
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={signupData.firstName}
                                            onChange={handleSignupChange}
                                            className={`${inputClasses} ${activeInputClasses}`}
                                            placeholder="Prénom"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <User className="absolute top-3 left-3 text-gray-400" size={20} />
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={signupData.lastName}
                                            onChange={handleSignupChange}
                                            className={`${inputClasses} ${activeInputClasses}`}
                                            placeholder="Nom"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="relative">
                                    <Mail className="absolute top-3 left-3 text-gray-400" size={20} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={signupData.email}
                                        onChange={handleSignupChange}
                                        className={`${inputClasses} ${activeInputClasses}`}
                                        placeholder="Email"
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute top-3 left-3 text-gray-400" size={20} />
                                    <input
                                        type={showPassword.signup ? "text" : "password"}
                                        name="password"
                                        value={signupData.password}
                                        onChange={handleSignupChange}
                                        className={`${inputClasses} ${activeInputClasses}`}
                                        placeholder="Mot de Passe"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute top-3 right-3 text-gray-400"
                                        onClick={() => toggleShowPassword('signup')}
                                    >
                                        {showPassword.signup ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute top-3 left-3 text-gray-400" size={20} />
                                    <input
                                        type={showPassword.confirmSignup ? "text" : "password"}
                                        name="confirmPassword"
                                        value={signupData.confirmPassword}
                                        onChange={handleSignupChange}
                                        className={`${inputClasses} ${activeInputClasses}`}
                                        placeholder="Confirmé Mot de Passe"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute top-3 right-3 text-gray-400"
                                        onClick={() => toggleShowPassword('confirmSignup')}
                                    >
                                        {showPassword.confirmSignup ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <motion.button
                                    type="submit"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`${buttonClasses} border border-gray-600`}
                                    disabled={isLoading.signup}
                                >
                                    {isLoading.signup ? (
                                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : "S'inscrire"}
                                </motion.button>
                            </form>
                            <p className="mt-8 text-center text-gray-300">
                                Vous avez deja un compte ?{' '}
                                <button onClick={() => setIsLogin(true)} className="text-white hover:text-darkgreen-300 transition-colors duration-300 font-semibold underline">
                                    Se Connecter
                                </button>
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Login;
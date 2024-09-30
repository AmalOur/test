import ReactTypingEffect from 'react-typing-effect';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-scroll';
import { Link as RouterLink } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Mail, Phone, MapPin, Menu, X, Send } from 'lucide-react';
import './App.css';

const SectionTitle = ({ children }) => (
  <h2 className="text-3xl md:text-4xl font-bold mb-12 text-white text-center">
    {children}
  </h2>
);

const PricingCard = ({ title, price, features }) => (
  <div className="flex flex-col items-center p-8 bg-darkgreen-800 rounded-lg shadow-lg">
    <h3 className="text-2xl font-semibold text-white mb-3">{title}</h3>
    <p className="text-3xl font-bold text-white mb-6">{price}</p>
    <ul className="text-darkgreen-300 text-center">
      {features.map((feature, index) => (
        <li key={index} className="mb-2">{feature}</li>
      ))}
    </ul>
    <button className="mt-6 px-6 py-2 bg-white text-darkgreen-900 rounded border-2 border-transparent hover:bg-darkred-900 hover:text-white hover:border-white transition-all duration-300">
      Choisir ce plan
    </button>
  </div>
);

const FeatureSection = ({ title, description, image }) => (
  <div className="mb-20 relative h-96 bg-cover bg-center rounded-lg overflow-hidden" style={{ backgroundImage: `url(${image})` }}>
    <div className="absolute inset-0 bg-darkgreen-900 bg-opacity-70 flex items-center justify-center">
      <div className="text-center p-8 max-w-2xl">
        <h3 className="text-2xl font-semibold mb-4 text-white">{title}</h3>
        <p className="text-white">{description}</p>
      </div>
    </div>
  </div>
);

const NavLink = ({ to, children }) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const section = document.getElementById(to);
      if (section) {
        const rect = section.getBoundingClientRect();
        setIsActive(rect.top <= 50 && rect.bottom >= 50);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [to]);

  return (
    <Link
      to={to}
      smooth={true}
      duration={500}
      className={`nav-link text-sm font-medium hover:text-darkgreen-300 transition-colors cursor-pointer ${isActive ? 'active' : ''}`}
    >
      {children}
    </Link>
  );
};

const App = () => {
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Form submitted:', formData);
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden bg-darkgreen-900">
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-darkgreen-900 bg-opacity-50 backdrop-filter backdrop-blur-lg">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="home" smooth={true} duration={500} className="text-2xl font-bold cursor-pointer">
            <div className="flex justify-center">
              <img src="/image/logo_d.png" alt="LEGALIA Logo" className="w-24 h-auto" />
            </div>
          </Link>
          <nav className="hidden md:flex gap-8">
            <NavLink to="fonctionnalites">FONCTIONNALITÉS</NavLink>
            <NavLink to="tarifs">TARIFS</NavLink>
            <NavLink to="a-propos">À PROPOS</NavLink>
            <NavLink to="contact">CONTACTEZ-NOUS</NavLink>
          </nav>
          <RouterLink to="/login" className="hidden md:block px-4 py-2 text-sm font-medium bg-white text-darkgreen-900 rounded border-2 border-transparent hover:bg-darkgreen-900 hover:text-white hover:border-white transition-all duration-300">
            SE CONNECTER
          </RouterLink>
          <button className="md:hidden text-white" onClick={toggleMenu}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 bg-darkgreen-900 z-40 flex flex-col items-center justify-center ${isMenuOpen ? 'block' : 'hidden'}`}>
        <nav className="flex flex-col gap-8 text-center">
          <Link to="fonctionnalites" smooth={true} duration={500} className="text-xl font-medium hover:text-darkgreen-300 transition-colors cursor-pointer" onClick={toggleMenu}>FONCTIONNALITÉS</Link>
          <Link to="tarifs" smooth={true} duration={500} className="text-xl font-medium hover:text-darkgreen-300 transition-colors cursor-pointer" onClick={toggleMenu}>TARIFS</Link>
          <Link to="a-propos" smooth={true} duration={500} className="text-xl font-medium hover:text-darkgreen-300 transition-colors cursor-pointer" onClick={toggleMenu}>À PROPOS</Link>
          <Link to="contact" smooth={true} duration={500} className="text-xl font-medium hover:text-darkgreen-300 transition-colors cursor-pointer" onClick={toggleMenu}>CONTACTEZ-NOUS</Link>
          <RouterLink to="/login" className="px-4 py-2 text-xl font-medium bg-white text-darkgreen-900 rounded border-2 border-transparent hover:bg-darkgreen-900 hover:text-white hover:border-white transition-all duration-300" onClick={toggleMenu}>
            SE CONNECTER
          </RouterLink>
        </nav>
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center bg-cover bg-center"
        style={{ 
          backgroundImage: "url('/image/bglia.png')",
          y: backgroundY
        }}
        id="home"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-darkgreen-800 opacity-100"></div>
        <h1 className="text-2xl md:text-4xl font-bold mb-4 relative z-20">
          L'EXPERTISE JURIDIQUE MAROCAINE
        </h1>
        <p className="text-l md:text-xl text-darkgreen-300 relative z-20 mb-2">
          VOTRE ASSISTANT LEGAL IA
        </p> 
        <p className="text-l md:text-xl text-darkgreen-300 relative z-20 mb-8">
          VOTRE ASSISTANT POUR CHAQUE <span className="font-reem-kufi text-3xl">قضية</span>
        </p>
        <RouterLink 
          to="/login"
          className="px-8 py-3 bg-white text-darkgreen-900 text-lg rounded border-2 border-transparent hover:bg-darkred-900 hover:text-white hover:border-white transition-all duration-300 inline-block relative z-20"
        >
          Commencer maintenant
        </RouterLink>
      </motion.div>

      <section id="fonctionnalites" className="py-20 bg-darkgreen-800">
        <div className="container mx-auto px-4">
          <SectionTitle>Fonctionnalités</SectionTitle>
          <FeatureSection
            title="Analyse juridique avancée"
            description="Notre IA analyse vos documents juridiques en profondeur, identifiant les points clés et les risques potentiels avec une précision inégalée."
            image="/image/source.jpg"
          />
          <FeatureSection
            title="Sécurité des données"
            description="Vos informations sont protégées par des protocoles de sécurité de pointe, garantissant la confidentialité de vos dossiers sensibles."
            image="/image/secure.jpg"
          />
          <FeatureSection
            title="Assistance 24/7"
            description="Notre assistant IA est disponible à tout moment pour répondre à vos questions juridiques urgentes, vous offrant un support continu."
            image="/image/supp.jpg"
          />
        </div>
      </section>

      <section id="tarifs" className="py-20 bg-darkred-900">
        <div className="container mx-auto px-4">
          <SectionTitle>Tarifs</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard
              title="Basic"
              price="500 DH/mois"
              features={[
                "Accès aux fonctionnalités de base",
                "Support par email",
                "Mises à jour mensuelles"
              ]}
            />
            <PricingCard
              title="Pro"
              price="1000 DH/mois"
              features={[
                "Toutes les fonctionnalités Basic",
                "Analyse juridique avancée",
                "Support prioritaire"
              ]}
            />
            <PricingCard
              title="Enterprise"
              price="Sur devis"
              features={[
                "Solution personnalisée",
                "Intégration sur mesure",
                "Support dédié 24/7"
              ]}
            />
          </div>
        </div>
      </section>

      <section id="a-propos" className="py-20 bg-cover bg-center" style={{ backgroundImage: "url('/image/hall.jpg')" }}>
        <div className="container mx-auto px-4 relative z-10">
          <div className="bg-darkgreen-800 bg-opacity-80 p-8 rounded-lg">
          <SectionTitle>À Propos</SectionTitle>
            <div className="text-lg text-white max-w-3xl mx-auto text-center font-serif">
              <ReactTypingEffect
                text={[
                  "<strong>LEGALIA</strong> est le fruit de la collaboration entre des experts juridiques marocains et des spécialistes en intelligence artificielle. Notre mission est de démocratiser l'accès à l'expertise juridique au Maroc, en combinant la richesse du droit marocain avec les dernières avancées technologiques."
                ]}
                speed={50}
                eraseDelay={700000}
                typingDelay={1000}
                cursorRenderer={cursor => <span>{cursor}</span>}
                displayTextRenderer={(text, i) => {
                  return (
                    <p dangerouslySetInnerHTML={{ __html: text }} />
                  );
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 bg-darkgreen-900">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-12 text-white text-center">Contactez-Nous</h2>
        <div className="flex flex-col md:flex-row bg-darkgreen-800 rounded-lg overflow-hidden shadow-2xl">
          <div className="md:w-1/2 bg-darkgreen-700 p-12 flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-white mb-6">Restons en contact</h3>
              <p className="text-darkgreen-300">
                Nous sommes là pour répondre à toutes vos questions. 
              </p>
              <p>
                N'hésitez pas à nous contacter pour toute information supplémentaire !
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center text-darkgreen-300">
                <Mail className="mr-4 w-6 h-6" />
                <span>contact@legalia.ma</span>
              </div>
              <div className="flex items-center text-darkgreen-300">
                <Phone className="mr-4 w-6 h-6" />
                <span>+212 5XX XX XX XX</span>
              </div>
              <div className="flex items-center text-darkgreen-300">
                <MapPin className="mr-4 w-6 h-6" />
                <span>123 Rue du Droit, Casablanca, Maroc</span>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-darkgreen-300 mb-1">Nom</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 bg-darkgreen-900 rounded border border-darkgreen-600 focus:outline-none focus:border-white transition-colors duration-300 text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-darkgreen-300 mb-1">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-3 bg-darkgreen-900 rounded border border-darkgreen-600 focus:outline-none focus:border-white transition-colors duration-300 text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-darkgreen-300 mb-1">Sujet</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full p-3 bg-darkgreen-900 rounded border border-darkgreen-600 focus:outline-none focus:border-white transition-colors duration-300 text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-darkgreen-300 mb-1">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="4"
                  className="w-full p-3 bg-darkgreen-900 rounded border border-darkgreen-600 focus:outline-none focus:border-white transition-colors duration-300 text-white"
                  required
                ></textarea>
              </div>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.95 }}
                className="w-full p-3 bg-white text-darkgreen-900 rounded font-semibold flex items-center justify-center space-x-2 border hover:bg-darkgreen-800 hover:text-white hover:border-white transition-colors duration-300"
              >
                <span>Envoyer</span>
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </section>

      <footer className="py-12 bg-darkgreen-800 text-center">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className='text-center'>
              <div className="flex justify-center">
                <img src="/image/LE_d.png" alt="LEGALIA Logo" className="w-24 h-auto" />
              </div>
              <p className="text-sm text-darkgreen-300 ">L'expertise juridique </p>
              <p className="text-sm text-darkgreen-300 "> marocaine à portée</p>
              <p className="text-sm text-darkgreen-300 "> de main</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Liens rapides</h4>
              <ul className="space-y-2">
                <li><Link to="fonctionnalites" smooth={true} duration={500} className="text-sm text-darkgreen-300 hover:text-red-600 transition-colors cursor-pointer">Fonctionnalités</Link></li>
                <li><Link to="tarifs" smooth={true} duration={500} className="text-sm text-darkgreen-300 hover:text-red-600 transition-colors cursor-pointer">Tarifs</Link></li>
                <li><Link to="a-propos" smooth={true} duration={500} className="text-sm text-darkgreen-300 hover:text-red-600 transition-colors cursor-pointer">À Propos</Link></li>
                <li><Link to="contact" smooth={true} duration={500} className="text-sm text-darkgreen-300 hover:text-red-600 transition-colors cursor-pointer">Contactez-Nous</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Légal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-darkgreen-300 hover:text-red-600 transition-colors">Conditions d'utilisation</a></li>
                <li><a href="#" className="text-sm text-darkgreen-300 hover:text-red-600 transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="text-sm text-darkgreen-300 hover:text-red-600 transition-colors">Mentions légales</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-darkgreen-700 pt-8">
            <p className="text-sm text-darkgreen-300">&copy; 2024 LEGALIA - Tous droits réservés</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
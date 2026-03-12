import { useState, useRef, useEffect } from "react";
import {
  MapPin, Phone, Clock, ArrowRight, Building2, CalendarDays, MessageCircle,
  Sparkles, HeartPulse, Scissors, SprayCan, Search, Cog, Layers, CircleDot, HelpCircle,
  Menu, X,
  type LucideIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import RentalRequestForm from "@/components/booking/RentalRequestForm";
import BookingDialog from "@/components/booking/BookingDialog";
import heroImage from "@/assets/hero-clinic.jpg";
import logoIcon from "@/assets/logo-icon-white.png";
import logoWhite from "@/assets/logo-white.png";
import logoGreen from "@/assets/logo-green.svg";
import logoHeaderWhite from "@/assets/logo-header-white.png";

const SERVICES: { name: string; treatment: string; icon: LucideIcon; img?: string; desc: string }[] = [
  { name: "Blanqueamiento", treatment: "Blanqueamiento", icon: Sparkles, desc: "Ilumina tu sonrisa con tratamientos profesionales seguros y efectivos." },
  { name: "Endodoncia", treatment: "Endodoncia", icon: HeartPulse, desc: "Tratamiento de conductos para salvar y preservar tu pieza dental." },
  { name: "Extracción", treatment: "Extracción", icon: Scissors, desc: "Procedimientos seguros y modernos con mínima molestia." },
  { name: "Limpieza Dental", treatment: "Limpieza Dental", icon: SprayCan, desc: "Eliminación de placa y sarro para una sonrisa radiante." },
  { name: "Revisión", treatment: "Revisión", icon: Search, desc: "Evaluación completa de tu salud bucal con diagnóstico preciso." },
  { name: "Prótesis", treatment: "Prótesis", icon: Cog, desc: "Soluciones protésicas personalizadas para restaurar tu sonrisa." },
  { name: "Resina Compuesta", treatment: "Resina Compuesta", icon: Layers, desc: "Restauraciones estéticas con materiales de última generación." },
  { name: "Implantes", treatment: "Implantes", icon: CircleDot, desc: "Implantes dentales de alta calidad para resultados permanentes." },
  { name: "Otros", treatment: "Otros", icon: HelpCircle, desc: "Consulta personalizada según tus necesidades específicas." },
];

const WA_LINK = "https://wa.me/584227180013?text=Hola,%20deseo%20agendar%20una%20evaluación%20en%20Salud%20Oriente.";

const Index = () => {
  const [rentalOpen, setRentalOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingTreatment, setBookingTreatment] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openBooking = (treatment = "") => {
    setBookingTreatment(treatment);
    setBookingOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background font-body">
      {/* ── STICKY NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-[10px] bg-noir/80 border-b border-noir-light/30">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          {/* Left: Isotipo */}
          <Link to="/" className="flex items-center shrink-0">
            <img
              src={logoIcon}
              alt="Clínica Odontológica Salud Oriente"
              className="w-[45px] md:w-[55px] h-[45px] md:h-[55px] object-contain"
            />
          </Link>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#servicios" className="text-noir-foreground/70 hover:text-gold transition-colors text-sm font-medium tracking-wide">Tratamientos</a>
            <a href="#contacto" className="text-noir-foreground/70 hover:text-gold transition-colors text-sm font-medium tracking-wide">Nosotros</a>
            <button onClick={() => setRentalOpen(true)} className="text-noir-foreground/70 hover:text-gold transition-colors text-sm font-medium tracking-wide">
              Alquiler
            </button>
          </nav>

          {/* Right: Action buttons (desktop) + Mobile hamburger & CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-3">
              <a
                href="#contacto"
                className="px-5 py-2 text-sm font-semibold rounded border border-clinic-green text-noir-foreground hover:bg-clinic-green/10 transition-colors"
              >
                Contactar
              </a>
              <button
                onClick={() => openBooking()}
                className="btn-gold px-5 py-2 text-sm flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" /> Agendar Cita
              </button>
            </div>

            {/* Mobile: CTA + Hamburger */}
            <button
              onClick={() => openBooking()}
              className="md:hidden btn-gold px-3 py-2 text-xs flex items-center gap-1.5"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Cita
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-noir-foreground/70 hover:text-gold transition-colors p-1"
              aria-label="Menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-noir/95 backdrop-blur-md border-t border-noir-light/20 animate-fade-up">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <a href="#servicios" onClick={() => setMobileMenuOpen(false)} className="text-noir-foreground/80 hover:text-gold transition-colors text-base font-medium py-2 border-b border-noir-light/10">
                Tratamientos
              </a>
              <a href="#contacto" onClick={() => setMobileMenuOpen(false)} className="text-noir-foreground/80 hover:text-gold transition-colors text-base font-medium py-2 border-b border-noir-light/10">
                Nosotros
              </a>
              <button onClick={() => { setRentalOpen(true); setMobileMenuOpen(false); }} className="text-left text-noir-foreground/80 hover:text-gold transition-colors text-base font-medium py-2 border-b border-noir-light/10">
                Alquiler para Profesionales
              </button>
              <a href="#contacto" onClick={() => setMobileMenuOpen(false)} className="text-center mt-2 px-5 py-2.5 text-sm font-semibold rounded border border-clinic-green text-noir-foreground hover:bg-clinic-green/10 transition-colors">
                Contactar
              </a>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ── HERO SECTION ── */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <img
            src={heroImage}
            alt="Interior moderno de la Clínica Odontológica Salud Oriente en Puerto La Cruz"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 hero-overlay" />
          {/* Watermark isotipo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img src={logoWhite} alt="" className="w-[500px] md:w-[700px] h-auto opacity-[0.03]" aria-hidden="true" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsla(43,78%,62%,0.06)_0%,_transparent_70%)]" />

          <div className="relative z-10 container mx-auto px-4 pt-24 lg:pt-32 pb-16 lg:pb-24">
            <div className="max-w-3xl mx-auto text-center">
              <img
                src={logoHeaderWhite}
                alt="Clínica Odontológica Salud Oriente"
                className="h-[40px] md:h-[55px] lg:h-[65px] w-auto object-contain mx-auto mb-2 drop-shadow-[0_2px_10px_rgba(232,192,86,0.2)]"
              />
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-noir-foreground font-bold leading-tight mb-6 animate-fade-up-delay-1">
                Odontología Estética e Implantes en{" "}
                <span className="text-gold">Puerto La Cruz</span>
              </h1>
              <p className="text-noir-foreground/80 text-lg md:text-xl mb-10 max-w-xl mx-auto animate-fade-up-delay-2 leading-relaxed">
                Tu sonrisa merece lo mejor...
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up-delay-3">
                <button
                  onClick={() => openBooking()}
                  className="btn-gold inline-flex items-center gap-2 px-8 py-4 text-lg"
                >
                  Agendar Cita <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setRentalOpen(true)}
                  className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold rounded border-2 border-clinic-green text-noir-foreground hover:bg-clinic-green/10 transition-colors"
                >
                  Alquiler para Profesionales <Building2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14 lg:mt-20 max-w-4xl mx-auto animate-fade-up-delay-3">
              <InfoCard icon={<MapPin className="w-5 h-5 text-gold" />} title="Ubicación" text="C.C Novocentro piso 1, local 1-02, Puerto La Cruz" href="https://maps.app.goo.gl/Ku3FFCzB6b9RB5sm9" />
              <InfoCard icon={<Phone className="w-5 h-5 text-gold" />} title="Teléfono" text="0422-7180013" href="https://wa.me/584227180013" />
              <InfoCard icon={<Clock className="w-5 h-5 text-gold" />} title="Horario" text="Lun-Vie 8:00–17:00 · Sáb 8:00–14:00" />
            </div>
          </div>
        </section>

        {/* ── SERVICIOS GRID ── */}
        <section id="servicios" className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-3xl md:text-4xl text-center font-bold mb-4">
              Nuestros <span className="text-gold">Tratamientos</span>
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
              Tratamientos odontológicos de alta calidad con tecnología moderna y atención personalizada.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {SERVICES.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.name}
                    onClick={() => openBooking(s.treatment)}
                    className="service-card bg-card rounded-xl overflow-hidden text-left border border-border group"
                  >
                    {s.img ? (
                      <div className="h-44 overflow-hidden">
                        <img
                          src={s.img}
                          alt={s.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center bg-secondary/40 group-hover:bg-clinic-green/5 transition-colors duration-300">
                        <Icon className="w-14 h-14 text-gold group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-display text-xl font-semibold mb-2">{s.name}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CONTACTO & MAPA ── */}
        <section id="contacto" className="relative py-20 bg-pearl">
          <div className="container mx-auto px-4">

            <div className="max-w-4xl mx-auto">
              <h3 className="font-display text-2xl text-pearl-foreground font-bold mb-6 text-center">Encuéntranos</h3>
              <div className="rounded-xl overflow-hidden border border-clinic-green/20">
                <a href="https://maps.app.goo.gl/Ku3FFCzB6b9RB5sm9" target="_blank" rel="noopener noreferrer" className="block w-full">
                  <iframe
                    src="https://maps.google.com/maps?q=Cl%C3%ADnica+Odontol%C3%B3gica+Salud+Oriente+Novocentro+Puerto+La+Cruz+Anzoategui+Venezuela&t=&z=18&ie=UTF8&iwloc=&output=embed"
                    width="100%"
                    height="350"
                    style={{ border: 0, pointerEvents: "none" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Ubicación de la Clínica Odontológica Salud Oriente"
                  />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="noir-gradient py-8 border-t border-noir-light/20">
        <div className="container mx-auto px-4 text-center space-y-4">
          <img src={logoWhite} alt="Salud Oriente" className="h-[140px] md:h-[180px] lg:h-[200px] w-auto max-w-[90%] mx-auto drop-shadow-[0_2px_10px_rgba(232,192,86,0.15)]" />
          <p className="text-noir-foreground/90 text-lg md:text-xl font-display font-semibold italic">
            "¿Listo para tu nueva sonrisa?"
          </p>

          {/* Instagram CTA */}
          <a
            href="https://www.instagram.com/odontosaludoriente/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white px-6 py-3 rounded-full font-semibold text-sm hover:scale-105 transition-transform shadow-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            Síguenos en Instagram
          </a>

          <p className="text-noir-foreground/50 text-sm">
            RIF: J-50800151-6 · © 2026 Clínica Odontológica Salud Oriente. Todos los derechos reservados.
          </p>
          <Link to="/login" className="text-noir-foreground/25 text-xs hover:text-noir-foreground/50 transition-colors inline-block">
            Acceso
          </Link>
        </div>
      </footer>

      {/* ── WHATSAPP FAB ── */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-[0_4px_20px_hsla(43,78%,62%,0.3)] hover:scale-110 transition-transform"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </a>

      <RentalRequestForm open={rentalOpen} onOpenChange={setRentalOpen} />
      <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} initialTreatment={bookingTreatment} />
    </div>
  );
};

const InfoCard = ({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href?: string }) => (
  <a
    href={href}
    target={href ? "_blank" : undefined}
    rel={href ? "noopener noreferrer" : undefined}
    className="glass-card-pearl rounded-xl p-5 text-center block hover:opacity-90 transition-opacity"
  >
    <div className="flex items-center justify-center mb-3">{icon}</div>
    <h3 className="font-display font-semibold text-pearl-foreground mb-1">{title}</h3>
    <p className="text-pearl-foreground/70 text-sm">{text}</p>
  </a>
);

export default Index;

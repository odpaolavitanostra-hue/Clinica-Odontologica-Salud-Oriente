import { MapPin, Phone, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-clinic.jpg";
import serviceLimpieza from "@/assets/service-limpieza.jpg";
import serviceResina from "@/assets/service-resina.jpg";
import serviceExtraccion from "@/assets/service-extraccion.jpg";
import serviceEndodoncia from "@/assets/service-endodoncia.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-body">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 noir-gradient">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-lg md:text-xl text-gold font-semibold tracking-wide">
            COSO
          </h1>
          <div className="flex gap-3">
            <Link
              to="/reservar"
              className="bg-gold text-gold-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Reservar Cita
            </Link>
            <Link
              to="/login"
              className="border border-gold/30 text-noir-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-gold/60 transition-colors"
            >
              Acceso
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <img
          src={heroImage}
          alt="Consultorio dental moderno"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        
        <div className="relative z-10 container mx-auto px-4 pt-20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-gold text-sm md:text-base font-semibold tracking-[0.3em] uppercase mb-6 animate-fade-up">
              Odontología de Excelencia
            </p>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-noir-foreground font-bold leading-tight mb-6 animate-fade-up-delay-1">
              Clínica Odontológica{" "}
              <span className="text-gold">Salud Oriente</span>
            </h1>
            <p className="text-noir-foreground/70 text-lg md:text-xl mb-10 max-w-xl mx-auto animate-fade-up-delay-2">
              Tu sonrisa merece lo mejor. Atención profesional y personalizada en Puerto La Cruz.
            </p>
            <Link
              to="/reservar"
              className="inline-flex items-center gap-2 bg-gold text-gold-foreground px-8 py-4 rounded-xl text-lg font-semibold hover:opacity-90 transition-opacity animate-fade-up-delay-3"
            >
              Agendar Cita <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-4xl mx-auto animate-fade-up-delay-3">
            <InfoCard
              icon={<MapPin className="w-5 h-5 text-gold" />}
              title="Ubicación"
              text="C.C Novocentro piso 1, local 1-02, Puerto La Cruz 6023, Anzoátegui"
            />
            <InfoCard
              icon={<Phone className="w-5 h-5 text-gold" />}
              title="Teléfono"
              text="+58 422 7180013"
            />
            <InfoCard
              icon={<Clock className="w-5 h-5 text-gold" />}
              title="Horario"
              text="Lun-Vie 8:00-17:00 • Sáb 8:00-14:00"
            />
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl text-center font-bold mb-4">
            Nuestros <span className="text-gold">Servicios</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            Ofrecemos tratamientos odontológicos de alta calidad con tecnología moderna.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Limpieza Dental", img: serviceLimpieza, desc: "Eliminación de placa y sarro para una sonrisa radiante." },
              { name: "Resina Compuesta", img: serviceResina, desc: "Restauraciones estéticas con materiales de última generación." },
              { name: "Extracción", img: serviceExtraccion, desc: "Procedimientos seguros con mínima molestia." },
              { name: "Endodoncia", img: serviceEndodoncia, desc: "Tratamiento de conductos para salvar tu pieza dental." },
            ].map((s) => (
              <div
                key={s.name}
                className="bg-card rounded-xl overflow-hidden gold-border hover:gold-glow transition-shadow duration-300 group"
              >
                <div className="h-40 overflow-hidden">
                  <img src={s.img} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold mb-2">{s.name}</h3>
                  <p className="text-muted-foreground text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 noir-gradient">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl text-noir-foreground font-bold mb-8">
            Encuéntranos
          </h2>
          <div className="max-w-4xl mx-auto rounded-xl overflow-hidden gold-border">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3925.123!2d-64.63!3d10.22!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDEzJzEyLjAiTiA2NMKwMzcnNDguMCJX!5e0!3m2!1ses!2sve!4v1234567890"
              width="100%"
              height="350"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación de la clínica"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary-foreground/60 text-sm">
            © 2026 Clínica Odontológica Salud Oriente. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

const InfoCard = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="glass-card-pearl rounded-xl p-5 text-center">
    <div className="flex items-center justify-center mb-3">{icon}</div>
    <h3 className="font-display font-semibold text-pearl-foreground mb-1">{title}</h3>
    <p className="text-pearl-foreground/70 text-sm">{text}</p>
  </div>
);

export default Index;

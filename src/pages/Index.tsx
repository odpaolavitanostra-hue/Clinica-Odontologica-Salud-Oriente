import { useState } from "react";
import { MapPin, Phone, Clock, ArrowRight, Building2, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import RentalRequestForm from "@/components/booking/RentalRequestForm";
import BookingDialog from "@/components/booking/BookingDialog";
import heroImage from "@/assets/hero-clinic.jpg";
import serviceLimpieza from "@/assets/service-limpieza.jpg";
import serviceResina from "@/assets/service-resina.jpg";
import serviceExtraccion from "@/assets/service-extraccion.jpg";
import serviceEndodoncia from "@/assets/service-endodoncia.jpg";
import serviceRevision from "@/assets/service-revision.jpg";
import serviceBlanqueamiento from "@/assets/service-blanqueamiento.jpg";
import serviceProtesis from "@/assets/service-protesis.jpg";

const Index = () => {
  const [rentalOpen, setRentalOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingTreatment, setBookingTreatment] = useState("");
  return (
    <div className="min-h-screen bg-background font-body">
      <nav className="fixed top-0 left-0 right-0 z-50 noir-gradient">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-lg md:text-xl text-gold font-semibold tracking-wide">
            COSO
          </h1>
          <div className="flex items-center gap-4">
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <img src={heroImage} alt="Consultorio dental moderno" className="absolute inset-0 w-full h-full object-cover" />
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up-delay-3">
              <button
                onClick={() => { setBookingTreatment(""); setBookingOpen(true); }}
                className="btn-gold inline-flex items-center gap-2 px-8 py-4 text-lg"
              >
                Agendar Cita <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setRentalOpen(true)}
                className="btn-gold inline-flex items-center gap-2 px-8 py-4 text-lg"
              >
                Alquiler para Profesionales <Building2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-4xl mx-auto animate-fade-up-delay-3">
            <InfoCard icon={<MapPin className="w-5 h-5 text-primary" />} title="Ubicación" text="C.C Novocentro piso 1, local 1-02, Puerto La Cruz 6023, Anzoátegui" />
            <InfoCard icon={<Phone className="w-5 h-5 text-primary" />} title="Teléfono" text="0422-7180013" href="https://wa.me/584227180013" />
            <InfoCard icon={<Clock className="w-5 h-5 text-primary" />} title="Horario" text="Lun-Vie 8:00-17:00 • Sáb 8:00-14:00" />
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl text-center font-bold mb-4">
            Nuestros <span className="text-primary">Servicios</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            Ofrecemos tratamientos odontológicos de alta calidad con tecnología moderna.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { name: "Blanqueamiento", treatment: "Blanqueamiento", img: serviceBlanqueamiento, desc: "Ilumina tu sonrisa con tratamientos profesionales seguros." },
              { name: "Endodoncia", treatment: "Endodoncia", img: serviceEndodoncia, desc: "Tratamiento de conductos para salvar tu pieza dental." },
              { name: "Extracción", treatment: "Extracción", img: serviceExtraccion, desc: "Procedimientos seguros con mínima molestia." },
              { name: "Limpieza Dental", treatment: "Limpieza Dental", img: serviceLimpieza, desc: "Eliminación de placa y sarro para una sonrisa radiante." },
              { name: "Otros", treatment: "Otros", img: serviceRevision, desc: "Consulta personalizada según tus necesidades." },
              { name: "Prótesis", treatment: "Prótesis", img: serviceProtesis, desc: "Soluciones protésicas personalizadas para restaurar tu sonrisa." },
              { name: "Resina Compuesta", treatment: "Resina Compuesta", img: serviceResina, desc: "Restauraciones estéticas con materiales de última generación." },
              { name: "Revisión", treatment: "Revisión", img: serviceRevision, desc: "Evaluación completa de tu salud bucal con diagnóstico preciso." },
            ].map((s) => (
              <button
                key={s.name}
                onClick={() => { setBookingTreatment(s.treatment); setBookingOpen(true); }}
                className="bg-card rounded-xl overflow-hidden gold-border hover:gold-glow transition-shadow duration-300 group block text-left"
              >
                <div className="h-40 overflow-hidden">
                  <img src={s.img} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold mb-2">{s.name}</h3>
                  <p className="text-muted-foreground text-sm">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 noir-gradient">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl text-noir-foreground font-bold mb-8">Encuéntranos</h2>
          <div className="max-w-4xl mx-auto rounded-xl overflow-hidden gold-border">
            <a href="https://maps.app.goo.gl/Ku3FFCzB6b9RB5sm9" target="_blank" rel="noopener noreferrer" className="block w-full">
            <iframe
              src="https://maps.google.com/maps?q=Cl%C3%ADnica+Odontol%C3%B3gica+Salud+Oriente+Novocentro+Puerto+La+Cruz+Anzoategui+Venezuela&t=&z=18&ie=UTF8&iwloc=&output=embed"
              width="100%" height="350" style={{ border: 0, pointerEvents: "none" }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Ubicación de la clínica"
            />
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-primary py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <p className="text-primary-foreground/60 text-sm text-center">© 2026 Clínica Odontológica Salud Oriente. Todos los derechos reservados.</p>
          <Link to="/login" className="text-primary-foreground/30 text-xs hover:text-primary-foreground/50 transition-colors">Acceso</Link>
        </div>
      </footer>

      <RentalRequestForm open={rentalOpen} onOpenChange={setRentalOpen} />
      <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} initialTreatment={bookingTreatment} />
    </div>
  );
};

const InfoCard = ({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href?: string }) => {
  const link = href || (title === "Ubicación" ? "https://maps.app.goo.gl/Ku3FFCzB6b9RB5sm9" : undefined);
  return (
  <a href={link} target={link ? "_blank" : undefined} rel={link ? "noopener noreferrer" : undefined} className="glass-card-pearl rounded-xl p-5 text-center block hover:opacity-90 transition-opacity">
    <div className="flex items-center justify-center mb-3">{icon}</div>
    <h3 className="font-display font-semibold text-pearl-foreground mb-1">{title}</h3>
    <p className="text-pearl-foreground/70 text-sm">{text}</p>
  </a>
  );
};

export default Index;

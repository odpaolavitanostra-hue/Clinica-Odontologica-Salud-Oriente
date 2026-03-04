import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CalendarDays, Clock, CheckCircle2, MessageCircle, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface BookingConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  patientName: string;
  date: string;
  time: string;
  isPendingConfirmation?: boolean;
}

const BookingConfirmationModal = ({ open, onClose, patientName, date, time, isPendingConfirmation = false }: BookingConfirmationModalProps) => {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setShowCheck(true), 200);
      return () => clearTimeout(timer);
    }
    setShowCheck(false);
  }, [open]);

  const formattedDate = (() => {
    try {
      const [y, m, d] = date.split("-");
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      return dateObj.toLocaleDateString("es-VE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return date;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none bg-card p-0 overflow-hidden shadow-2xl">
        {/* Accent bar */}
        <div className="h-2 w-full bg-gradient-to-r from-primary via-primary/70 to-primary" />

        <div className="flex flex-col items-center text-center px-8 pt-8 pb-10 gap-5">
          {/* Animated icon */}
          <div
            className={`w-20 h-20 rounded-full ${isPendingConfirmation ? "bg-gold/15" : "bg-clinic-green/15"} flex items-center justify-center transition-all duration-500 ${
              showCheck ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          >
            {isPendingConfirmation ? (
              <Hourglass
                className={`w-12 h-12 text-gold transition-all duration-700 ${showCheck ? "scale-100" : "scale-0"}`}
                strokeWidth={2.2}
              />
            ) : (
              <CheckCircle2
                className={`w-12 h-12 text-clinic-green transition-all duration-700 ${showCheck ? "scale-100" : "scale-0"}`}
                strokeWidth={2.2}
              />
            )}
          </div>

          {/* Title */}
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {isPendingConfirmation ? "¡Solicitud enviada!" : "¡Cita agendada exitosamente!"}
          </h2>

          {/* Patient greeting */}
          <p className="text-muted-foreground text-base">
            Hola <span className="font-semibold text-foreground">{patientName}</span>,{" "}
            {isPendingConfirmation
              ? "tu solicitud de horario especial ha sido registrada para:"
              : "tu cita ha sido reservada para:"}
          </p>

          {/* Date & Time cards */}
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-3 bg-secondary rounded-2xl px-5 py-4">
              <CalendarDays className="w-7 h-7 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha</p>
                <p className="font-semibold text-foreground capitalize">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-secondary rounded-2xl px-5 py-4 sm:min-w-[140px]">
              <Clock className="w-7 h-7 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Hora</p>
                <p className="font-semibold text-foreground text-lg">{time}</p>
              </div>
            </div>
          </div>

          {/* Notice */}
          {isPendingConfirmation ? (
            <div className="w-full flex items-center gap-3 bg-gold/10 rounded-2xl px-5 py-4">
              <Hourglass className="w-6 h-6 text-gold shrink-0" />
              <p className="text-sm text-foreground text-left">
                Tu cita está <strong>sujeta a confirmación</strong> por parte del equipo médico. Te contactaremos pronto.
              </p>
            </div>
          ) : (
            <div className="w-full flex items-center gap-3 bg-clinic-green/10 rounded-2xl px-5 py-4">
              <MessageCircle className="w-6 h-6 text-clinic-green shrink-0" />
              <p className="text-sm text-foreground text-left">
                Pronto recibirás la <strong>confirmación por WhatsApp</strong>.
              </p>
            </div>
          )}

          {/* Address hint */}
          {!isPendingConfirmation && (
            <p className="text-xs text-muted-foreground text-center">
              ¡Te esperamos en <strong>C.C Novocentro piso 1, local 1-02, Puerto La Cruz</strong>! Llega <strong>5 minutos antes</strong> para tu ficha clínica.
            </p>
          )}
          {isPendingConfirmation && (
            <p className="text-xs text-muted-foreground text-center">
              Ubicación: <strong>C.C Novocentro piso 1, local 1-02, Puerto La Cruz</strong>.
            </p>
          )}

          {/* CTA */}
          <Button
            onClick={onClose}
            className="w-full mt-2 h-14 rounded-2xl text-lg font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingConfirmationModal;

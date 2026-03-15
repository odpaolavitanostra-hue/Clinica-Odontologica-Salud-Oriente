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

        <div className="flex flex-col items-center text-center px-6 sm:px-8 pt-6 sm:pt-8 pb-8 sm:pb-10 gap-4 sm:gap-5">
          {/* Animated icon */}
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${isPendingConfirmation ? "bg-gold/15" : "bg-clinic-green/15"} flex items-center justify-center transition-all duration-500 ${
              showCheck ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          >
            {isPendingConfirmation ? (
              <Hourglass className={`w-9 h-9 sm:w-12 sm:h-12 text-gold transition-all duration-700 ${showCheck ? "scale-100" : "scale-0"}`} strokeWidth={2.2} />
            ) : (
              <CheckCircle2 className={`w-9 h-9 sm:w-12 sm:h-12 text-clinic-green transition-all duration-700 ${showCheck ? "scale-100" : "scale-0"}`} strokeWidth={2.2} />
            )}
          </div>

          {/* Title */}
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {isPendingConfirmation ? "¡Solicitud enviada!" : "¡Cita agendada exitosamente!"}
          </h2>

          {/* Patient greeting */}
          <p className="text-muted-foreground text-sm sm:text-base">
            Hola <span className="font-semibold text-foreground">{patientName}</span>,{" "}
            {isPendingConfirmation
              ? "tu solicitud de horario especial ha sido registrada para:"
              : "tu cita ha sido reservada para:"}
          </p>

          {/* Date & Time cards — uniform grid */}
          <div className="w-full grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center justify-center gap-2 bg-secondary rounded-2xl px-4 py-5 text-center">
              <CalendarDays className="w-6 h-6 text-primary" />
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Fecha</p>
              <p className="font-semibold text-foreground text-sm sm:text-base capitalize leading-snug">{formattedDate}</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 bg-secondary rounded-2xl px-4 py-5 text-center">
              <Clock className="w-6 h-6 text-primary" />
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Hora</p>
              <p className="font-semibold text-foreground text-sm sm:text-base leading-snug">{time}</p>
            </div>
          </div>

          {/* Notice */}
          {isPendingConfirmation ? (
            <div className="w-full flex items-start gap-3 bg-gold/10 rounded-2xl px-4 py-3 sm:px-5 sm:py-4">
              <Hourglass className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-foreground text-left">
                Tu cita está <strong>sujeta a confirmación</strong> por parte del equipo médico. Te contactaremos pronto.
              </p>
            </div>
          ) : (
            <div className="w-full flex items-start gap-3 bg-clinic-green/10 rounded-2xl px-4 py-3 sm:px-5 sm:py-4">
              <MessageCircle className="w-5 h-5 text-clinic-green shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-foreground text-left">
                Pronto recibirás la <strong>confirmación por WhatsApp</strong>.
              </p>
            </div>
          )}

          {/* Address hint */}
          <p className="text-[11px] sm:text-xs text-muted-foreground text-center">
            {isPendingConfirmation
              ? <>Ubicación: <strong>C.C Novocentro piso 1, local 1-02, Puerto La Cruz</strong>.</>
              : <>¡Te esperamos en <strong>C.C Novocentro piso 1, local 1-02, Puerto La Cruz</strong>! Llega <strong>5 minutos antes</strong> para tu ficha clínica.</>
            }
          </p>

          {/* CTA */}
          <Button
            onClick={onClose}
            className="w-full mt-1 h-12 sm:h-14 rounded-2xl text-base sm:text-lg font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingConfirmationModal;

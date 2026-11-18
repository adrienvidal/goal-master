"use client";
import Link, { useLinkStatus } from "next/link";
import { useFormStatus } from "react-dom";

/** Trois points qui clignotent : « ça charge ». */
export function Dots({ className = "" }: { className?: string }): React.ReactElement {
  return (
    <span className={`dots ${className}`} role="status" aria-label="Chargement">
      <i />
      <i />
      <i />
    </span>
  );
}

function Pending({ children }: { children: React.ReactNode }): React.ReactElement {
  const { pending } = useLinkStatus();
  // Le libellé garde sa place (pas de saut de largeur) ; les points se posent par-dessus.
  return (
    <>
      <span className={pending ? "busy-label" : "contents"}>{children}</span>
      {pending ? <Dots className="dots-over" /> : null}
    </>
  );
}

/** Lien en forme de bouton : montre qu'il charge dès le clic, jusqu'à l'arrivée sur la page. */
export function LinkButton({ children, ...props }: React.ComponentProps<typeof Link>): React.ReactElement {
  return (
    <Link {...props}>
      <Pending>{children}</Pending>
    </Link>
  );
}

/** Faux bouton à l'intérieur d'un lien plus grand (une carte cliquable) : charge comme un LinkButton. */
export function LinkButtonLabel({ className, children }: { className: string; children: React.ReactNode }): React.ReactElement {
  return (
    <span className={className}>
      <Pending>{children}</Pending>
    </span>
  );
}

/** Libellé d'un bouton d'action : pendant l'enregistrement, les points remplacent le texte sans changer la taille. */
export function BusyLabel({ pending, children }: { pending: boolean; children: React.ReactNode }): React.ReactElement {
  return (
    <>
      <span className={pending ? "busy-label" : "contents"}>{children}</span>
      {pending ? <Dots className="dots-over" /> : null}
    </>
  );
}

/** Bouton d'envoi d'un formulaire serveur : grisé, avec les points, le temps de l'envoi. */
export function SubmitButton({ children, className, ...props }: React.ComponentProps<"button">): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <button type="submit" {...props} className={className} disabled={pending || props.disabled}>
      <BusyLabel pending={pending}>{children}</BusyLabel>
    </button>
  );
}

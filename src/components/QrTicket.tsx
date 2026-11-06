import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrTicket({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { margin: 1, width: 360, errorCorrectionLevel: "M" })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
    };
  }, [value]);

  return (
    <div className="rounded-xl bg-card p-2 shadow-[0_0_0_1px_var(--color-border)]">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-ink">
        {src ? (
          <img src={src} alt={`QR ticket ${label}`} className="h-full w-full" />
        ) : null}
      </div>
      <p className="mt-1.5 text-center text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        QR ticket
      </p>
    </div>
  );
}

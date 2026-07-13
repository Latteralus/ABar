import type { PropsWithChildren, ReactNode } from "react";

interface CardProps {
  title?: string;
  action?: ReactNode;
}

export function Card({ title, action, children }: PropsWithChildren<CardProps>) {
  return (
    <div className="card">
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {title && <p className="card-title">{title}</p>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

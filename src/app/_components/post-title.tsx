import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

export function PostTitle({ children }: Props) {
  return (
    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold font-mono tracking-tight leading-tight mb-6 text-left">
      {children}
    </h1>
  );
}

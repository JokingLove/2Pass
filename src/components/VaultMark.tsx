import type { SVGProps } from "react";

/** Use the same artwork as the favicon. */
export default function VaultMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <image href={import.meta.env.BASE_URL + "vault-mark.svg"} width="64" height="64" />
    </svg>
  );
}

import "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "md-circular-progress": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { indeterminate?: boolean },
        HTMLElement
      >;
      "md-linear-progress": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { indeterminate?: boolean },
        HTMLElement
      >;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "md-circular-progress": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { indeterminate?: boolean },
        HTMLElement
      >;
      "md-linear-progress": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { indeterminate?: boolean },
        HTMLElement
      >;
    }
  }
}

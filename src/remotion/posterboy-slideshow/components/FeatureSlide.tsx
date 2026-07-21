import React from "react";
import { useCurrentFrame } from "remotion";
import { ProductFrame } from "./ProductFrame";
import { FeatureHeadline } from "./FeatureHeadline";
import { SlideTransition } from "./SlideTransition";
import { InterfaceCallout } from "./InterfaceCallout";

type Props = {
  eyebrow: string;
  title: string;
  support: string;
  children: React.ReactNode;
  payoff?: string;
  payoffAt?: number;
  showHeadline?: boolean;
};

export const FeatureSlide: React.FC<Props> = ({
  eyebrow,
  title,
  support,
  children,
  payoff,
  payoffAt = 190,
  showHeadline = true,
}) => {
  const frame = useCurrentFrame();
  const showPayoff = payoff && frame >= payoffAt;

  return (
    <SlideTransition>
      <ProductFrame>
        {children}
        {showHeadline ? (
          <FeatureHeadline eyebrow={eyebrow} title={title} support={support} />
        ) : null}
        {showPayoff ? (
          <InterfaceCallout label={payoff} bottom={48} left={48} appearAt={0} />
        ) : null}
      </ProductFrame>
    </SlideTransition>
  );
};

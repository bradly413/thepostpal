/**
 * Wide-range user-prompt matrix: how Studio routes common briefs.
 * Complements scene-intent / routing unit tests with product-shaped copy.
 */
import { describe, expect, it } from "vitest";
import { isListingBrief } from "@/lib/studio/scene-intent";
import { extractReferenceImageUrl } from "@/lib/studio/reference-url";
import {
  needsComposeRewrite,
  resolveStudioImageRoute,
} from "@/lib/studio/studio-image-routing";

type Case = {
  name: string;
  prompt: string;
  refImage?: string | null;
  expectListing?: boolean;
  expectRoute?: ReturnType<typeof resolveStudioImageRoute>;
  expectCompose?: boolean;
  expectUrl?: string | null;
};

const CASES: Case[] = [
  {
    name: "vague outcome — compose",
    prompt: "make an instagram post about thanksgiving",
    expectCompose: true,
    expectRoute: "compose_generate",
  },
  {
    name: "short vague — compose",
    prompt: "something cozy for fall",
    expectCompose: true,
  },
  {
    name: "concrete food visual — direct",
    prompt: "bright latte art in a white ceramic cup, morning window light, overhead",
    expectCompose: false,
    expectRoute: "direct_generate",
  },
  {
    name: "smoothie product — direct",
    prompt: "green smoothie bottle on marble, condensation, soft daylight",
    expectCompose: false,
  },
  {
    name: "listing with address — blocked without photo",
    prompt: "make an instagram post about my new listing at 223 Victor Ct, Ballwin MO 63021",
    expectListing: true,
    expectRoute: "blocked_listing_no_photo",
  },
  {
    name: "listing with photo — passthrough",
    prompt: "new listing 14 Maple Lane, curb appeal exterior for Instagram",
    refImage: "https://cdn.example.com/listing.jpg",
    expectListing: true,
    expectRoute: "listing_passthrough",
  },
  {
    name: "sold just listed language — listing",
    prompt: "Just listed! Gorgeous colonial with open floor plan — 412 Oak Street",
    expectListing: true,
  },
  {
    name: "med spa injectables — compose/direct ok",
    prompt: "make a facebook post about our Botox special this week",
    expectCompose: true,
  },
  {
    name: "restaurant special — compose",
    prompt: "create an image for our Friday fish fry special",
    expectCompose: true,
  },
  {
    name: "realtor open house — listing-ish",
    prompt: "open house Saturday 1-3pm at 88 River Rd — exterior hero shot",
    expectListing: true,
  },
  {
    name: "prompt with embedded photo url",
    prompt:
      "enhance this listing photo https://photos.zillowstatic.com/fp/house123.jpg for Instagram",
    expectUrl: "https://photos.zillowstatic.com/fp/house123.jpg",
  },
  {
    name: "bare cloudfront url as reference",
    prompt: "https://dugdppfv1e8wf.cloudfront.net/tenants/x/house.png",
    expectUrl: "https://dugdppfv1e8wf.cloudfront.net/tenants/x/house.png",
  },
  {
    name: "brand hero — direct",
    prompt: "editorial portrait of a female realtor in navy blazer outside a modern home at golden hour",
    expectCompose: false,
  },
  {
    name: "skincare flatlay — direct",
    prompt: "skincare bottle flatlay with serum dropper, soft shadows, blush pink backdrop",
    expectCompose: false,
  },
  {
    name: "wellness quiet — direct",
    prompt: "calm yoga studio corner with rolled mat, plants, soft morning light",
    expectCompose: false,
  },
  {
    name: "tiktok-style request — compose",
    prompt: "make a tiktok post about our new happy hour",
    expectCompose: true,
  },
  {
    name: "linkedin thought leadership — compose",
    prompt: "make a linkedin post about closing three homes this month",
    expectCompose: true,
  },
  {
    name: "before after language without photo",
    prompt: "before and after kitchen remodel reveal",
    expectCompose: false,
  },
  {
    name: "team shoutout",
    prompt: "make a post about Sarah joining the team as our new esthetician",
    expectCompose: true,
  },
  {
    name: "holiday promo",
    prompt: "design an instagram post for Mother's Day gift cards",
    expectCompose: true,
  },
  // —— wider user prompt surface (expectations = current router behavior) ——
  {
    name: "one-word ask — coffee is a visual noun → direct",
    prompt: "coffee",
    expectCompose: false,
    expectRoute: "direct_generate",
  },
  {
    name: "grand opening — classic make-a-post → compose",
    prompt: "make a post about our grand opening this weekend",
    expectCompose: true,
  },
  {
    name: "typos / casual — mak an ig post → compose",
    prompt: "mak an ig post for our taco tuesday deal",
    expectCompose: true,
    expectRoute: "compose_generate",
  },
  {
    name: "price callout announce → compose",
    prompt: "announce our $99 facial package on instagram",
    expectCompose: true,
    expectRoute: "compose_generate",
  },
  {
    name: "gym / fitness",
    prompt: "make a facebook post about new morning HIIT classes",
    expectCompose: true,
  },
  {
    name: "salon hair",
    prompt: "balayage transformation for Instagram — soft beach waves",
    expectCompose: false,
  },
  {
    name: "contractor / trades",
    prompt: "create a post about our roof replacement before and after",
    expectCompose: true,
  },
  {
    name: "dentist",
    prompt: "make an instagram post about free whitening consults this month",
    expectCompose: true,
  },
  {
    name: "coffee shop product — direct",
    prompt: "pour-over coffee being poured into a clear carafe, steam, warm cafe light",
    expectCompose: false,
    expectRoute: "direct_generate",
  },
  {
    name: "listing + url in one breath — extract url",
    prompt:
      "Just listed 900 Elm St — use this photo https://mls.example.com/media/900-elm.jpeg for the post",
    expectListing: true,
    expectUrl: "https://mls.example.com/media/900-elm.jpeg",
  },
  {
    name: "listing + url + ref → passthrough",
    prompt: "new listing 900 Elm St Instagram exterior",
    refImage: "https://mls.example.com/media/900-elm.jpeg",
    expectListing: true,
    expectRoute: "listing_passthrough",
  },
  {
    name: "url with trailing punctuation",
    prompt: "enhance https://cdn.example.com/listing.png).",
    expectUrl: "https://cdn.example.com/listing.png",
  },
  {
    name: "http rejected — https only",
    prompt: "use http://cdn.example.com/a.jpg please",
    expectUrl: null,
  },
  {
    name: "reprompt-style delta without canvas → direct (needs prior gen for edit)",
    prompt: "make it warmer and add more plants",
    expectCompose: false,
    expectRoute: "direct_generate",
  },
  {
    name: "stories format → compose",
    prompt: "make an instagram story about our flash sale ending tonight",
    expectCompose: true,
    expectRoute: "compose_generate",
  },
  {
    name: "carousel ask → compose",
    prompt: "design a 3-slide carousel announcing spring menu",
    expectCompose: true,
    expectRoute: "compose_generate",
  },
  {
    name: "brand colors in prompt — direct-ish visual",
    prompt: "minimal poster with navy and gold typography saying Open House Sunday",
    expectCompose: false,
  },
  {
    name: "vacant land listing language",
    prompt: "new acreage listing 12 acres on Highway 100 for sale",
    expectListing: true,
  },
  {
    name: "commercial lease — not detected as listing (gap)",
    prompt: "available retail space downtown — 2,400 sq ft for lease",
    expectListing: false,
  },
  {
    name: "pet groomer",
    prompt: "make a cute instagram post about puppy spa day specials",
    expectCompose: true,
  },
  {
    name: "brewery announce → compose",
    prompt: "announce our new hazy IPA tap takeover this Friday",
    expectCompose: true,
    expectRoute: "compose_generate",
  },
  {
    name: "multi-sentence vague → compose",
    prompt:
      "I need something for social. We want more bookings. Maybe soft and calm vibes for the spa.",
    expectCompose: true,
    expectRoute: "compose_generate",
  },
  {
    name: "explicit edit of attached photo — routes direct (ref used, no compose)",
    prompt: "brighten this photo and crop for Instagram square",
    refImage: "https://cdn.example.com/room.jpg",
    expectRoute: "direct_generate",
  },
  {
    name: "short vague non-visual noun → compose",
    prompt: "something cozy",
    expectCompose: true,
    expectRoute: "compose_generate",
  },
  {
    name: "make linkedin image — compose",
    prompt: "generate a linkedin image about our Q2 wins",
    expectCompose: true,
  },
  {
    name: "Bruce website link — create images + site → compose",
    prompt: "can you create images for my website here is the link socelle.com",
    expectCompose: true,
    expectRoute: "compose_generate",
  },
];

describe("Studio prompt routing matrix (user-shaped briefs)", () => {
  for (const c of CASES) {
    it(c.name, () => {
      if (c.expectListing !== undefined) {
        expect(isListingBrief(c.prompt)).toBe(c.expectListing);
      }
      if (c.expectCompose !== undefined) {
        expect(needsComposeRewrite(c.prompt)).toBe(c.expectCompose);
      }
      if (c.expectUrl !== undefined) {
        expect(extractReferenceImageUrl(c.prompt)).toBe(c.expectUrl);
      }
      if (c.expectRoute) {
        const route = resolveStudioImageRoute({
          intent: c.prompt,
          refImage: c.refImage ?? null,
          generatedUrl: null,
          genState: "idle",
          lastGenPrompt: "",
        });
        expect(route).toBe(c.expectRoute);
      }
    });
  }
});

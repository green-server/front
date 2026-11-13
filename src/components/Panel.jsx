import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled, { css } from "styled-components";
import { setOrbit } from "@/lib/orbit";

/** `back`: `{ to, label }` for the crumb before the title. */
export function Panel({
  title,
  back,
  /** False where leaving would lose something that cannot be shown again. */
  escape = true,
  children,
}) {
  const navigate = useNavigate();

  useEffect(() => {
    setOrbit({ panel: true });
    return () => setOrbit({ panel: false });
  }, []);

  useEffect(() => {
    if (!escape) return;
    const onKey = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      // Escape in a field belongs to the field, not to the panel.
      if (event.target.closest("input, select, textarea")) return;
      navigate("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, escape]);

  // The frame stays put; only the body scrolls, so the box lines never scroll away.
  return (
    // `panel` is read by OrbitScene (it measures the panel and ignores drags that start on it).
    <Section className="panel frame" aria-label={title}>
      <Head>
        <Title>
          {back && (
            <>
              <Crumb to={back.to}>← {back.label}</Crumb>
              {" › "}
            </>
          )}
          <h1>{title}</h1>
        </Title>
        <Close to="/" aria-label="닫기">
          [x]
        </Close>
      </Head>
      <Body>{children}</Body>
    </Section>
  );
}

const Section = styled.section`
  position: fixed;
  top: calc(var(--bar-h) + var(--notice-h));
  right: 2ch;
  bottom: 1lh;
  z-index: 10;
  display: flex;
  flex-direction: column;
  width: min(60vw, 880px);
  padding: 1lh 1ch 0.5lh;
  background: var(--paper);

  /* The server page's big reading: plain ink inside a panel. */
  & .power-xl .power-value {
    color: var(--ink);
  }

  @media (max-width: 759.98px) {
    top: calc(var(--bar-h) + var(--notice-h));
    right: 0;
    bottom: var(--tabs-h);
    left: 0;
    width: auto;
  }
`;

/* The head sits on the frame's top line: path on the left, [x] on the right. */
const Head = styled.div`
  position: absolute;
  top: 0;
  left: 2ch;
  right: 2ch;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 2ch;
  pointer-events: none;
`;

const onLine = css`
  padding: 0 1ch;
  background: var(--paper);
  pointer-events: auto;
`;

const reverse = css`
  &:hover,
  &:focus-visible {
    background: var(--ink);
    color: var(--paper);
    outline: 0;
  }
`;

const Title = styled.span`
  ${onLine}
  min-width: 0;
  overflow: hidden;
  color: var(--ink-2);
  white-space: nowrap;
  text-overflow: ellipsis;

  & h1 {
    display: inline;
    color: var(--ink);
  }
`;

const Close = styled(Link)`
  ${onLine}
  flex: none;
  color: var(--ink-2);
  text-decoration: none;
  ${reverse}
`;

const Crumb = styled(Link)`
  color: var(--ink-2);
  text-decoration: none;
  ${reverse}
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  padding: 0.5lh 2ch 0.5lh;
  overflow-y: auto;
  scrollbar-color: var(--line) transparent;
  scrollbar-width: thin;
`;

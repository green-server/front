// Style blocks several pages and components share. Page-only styles live in the page's own file.
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";

/* A framed card over the scene: the sign-in form and the not-found / error notices. */
export const card = css`
  position: fixed;
  z-index: 10;
  display: grid;
  gap: 1lh;
  padding: 1lh 3ch;
  background: var(--paper);

  &::before {
    content: "";
    position: absolute;
    inset: 0.5lh 0.5ch;
    border: 1px solid var(--line);
    pointer-events: none;
  }
`;

export const NoticeCard = styled.main`
  ${card}
  top: 50%;
  left: 50%;
  width: min(48ch, calc(100vw - 2ch));
  transform: translate(-50%, -50%);
  justify-items: start;
`;

/* A form in a panel: fields stacked, the button at the start. */
export const Form = styled.form`
  display: grid;
  gap: 1lh;
  max-width: 48ch;

  .panel & {
    display: grid;
    gap: 1lh;
    max-width: 48ch;
  }

  & .btn {
    justify-self: start;
  }
`;

/* A list row in a panel: what it is on the left, its numbers on the right. */
const row = css`
  .panel & {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2ch;
  }
`;

export const RowMain = styled.span`
  display: grid;
  min-width: 0;

  & strong,
  & code {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

export const Row = styled.li`
  ${row}
`;

export const ServerRow = styled(Link)`
  ${row}
  color: inherit;
  text-decoration: none;

  &:hover ${RowMain} strong,
  &:focus-visible ${RowMain} strong {
    background: var(--ink);
    color: var(--paper);
  }
  & ${RowMain} {
    flex: 1;
  }

  @media (max-width: 759.98px) {
    .panel & {
      flex-wrap: wrap;
    }
  }
`;

export const RowKrw = styled.span`
  min-width: 12ch;
  text-align: right;

  @media (max-width: 759.98px) {
    min-width: 0;
  }
`;

export const ConsultSummary = styled.p`
  font-weight: 700;
`;

export const ConsultList = styled.ul`
  display: grid;
  margin: 0;
  padding-left: 3ch;

  ul& {
    list-style: "- ";
  }
  ol& {
    list-style: decimal;
  }
  & li::marker {
    color: var(--go);
  }
`;

export const AskActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5lh 2ch;
  margin-top: 1lh;
`;

/* Legend row over the chart; the server page puts the range picker in one too. */
export const ChartHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0 2ch;
`;

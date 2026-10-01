import {
  detail,
  term as styles_term,
  definition,
} from './App.css';

export namespace Detail {
  export interface Props { term: string; value: string }
}

export function Detail({ term, value }: Detail.Props) {
  return (
    <div className={detail}>
      <dt className={styles_term}>{term}</dt>
      <dd className={definition}>{value}</dd>
    </div>
  );
}

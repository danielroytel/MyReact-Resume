import { useState, useRef, useEffect } from 'react';
import { KEY_CODES } from '@utils';

export interface Job {
  /** Rendered HTML body from markdown */
  html: string;
  frontmatter: {
    title: string;
    company: string;
    team?: string;
    location?: string;
    range: string;
    range_abrv: string;
    url: string;
  };
}

interface Props {
  jobs: Job[];
}

const JobsTabs = ({ jobs }: Props) => {
  const [activeTabId, setActiveTabId] = useState(0);
  const [tabFocus, setTabFocus] = useState<number | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = () => {
    if (tabFocus === null) return;
    if (tabs.current[tabFocus]) {
      tabs.current[tabFocus]?.focus();
      return;
    }
    if (tabFocus >= tabs.current.length) setTabFocus(0);
    if (tabFocus < 0) setTabFocus(tabs.current.length - 1);
  };

  useEffect(() => {
    focusTab();
  }, [tabFocus]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case KEY_CODES.ARROW_UP:
        e.preventDefault();
        setTabFocus(f => (f === null ? 0 : f - 1));
        break;
      case KEY_CODES.ARROW_DOWN:
        e.preventDefault();
        setTabFocus(f => (f === null ? 0 : f + 1));
        break;
      default:
        break;
    }
  };

  return (
    <div className="jobs-inner">
      <div
        className="tab-list"
        role="tablist"
        aria-label="Job tabs"
        onKeyDown={onKeyDown}>
        {jobs.map((job, i) => {
          const { range_abrv } = job.frontmatter;
          return (
            <button
              key={i}
              ref={el => {
                tabs.current[i] = el;
              }}
              className={`tab-button${activeTabId === i ? ' is-active' : ''}`}
              onClick={() => setActiveTabId(i)}
              id={`tab-${i}`}
              role="tab"
              tabIndex={activeTabId === i ? 0 : -1}
              aria-selected={activeTabId === i}
              aria-controls={`panel-${i}`}>
              <span>{range_abrv}</span>
            </button>
          );
        })}
        <div
          className="tab-highlight"
          style={{ transform: `translateY(calc(${activeTabId} * var(--tab-height)))` }}
        />
      </div>

      <div className="tab-panels">
        {jobs.map((job, i) => {
          const { title, team, url, company, range } = job.frontmatter;
          return (
            <div
              key={i}
              className={`tab-panel${activeTabId === i ? ' is-active' : ''}`}
              id={`panel-${i}`}
              role="tabpanel"
              tabIndex={activeTabId === i ? 0 : -1}
              aria-labelledby={`tab-${i}`}
              aria-hidden={activeTabId !== i}
              hidden={activeTabId !== i}>
              <h3>
                <span>{title}</span>
                <span className="company">
                  &nbsp;@&nbsp;
                  <a href={url} className="inline-link" target="_blank" rel="noreferrer">
                    {company}
                  </a>
                </span>
              </h3>
              {team && <p className="team">{team}</p>}
              <p className="range">{range}</p>
              <div dangerouslySetInnerHTML={{ __html: job.html }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JobsTabs;

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './minigame.module.css';
import { P01_MINIGAME_DATA, MinigameOption } from './minigame-data';

export type GameStatus = 'PLAYING' | 'SUCCESS' | 'FAILURE';

export default function MinigamePlayer() {
  const data = P01_MINIGAME_DATA;

  // Selected option ID for each slot: { 1: "opt_1_correct", 2: ... }
  const [selectedSlots, setSelectedSlots] = useState<Record<number, string>>({});
  const [activeSlotToFill, setActiveSlotToFill] = useState<number>(1);
  const [gameStatus, setGameStatus] = useState<GameStatus>('PLAYING');
  const [wrongOption, setWrongOption] = useState<MinigameOption | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Toggle theme dark/light
  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('dark', nextDark);
      document.body.classList.toggle('light', !nextDark);
    }
  };

  const handleSelectOption = (opt: MinigameOption) => {
    if (gameStatus !== 'PLAYING') return;

    const newSlots = { ...selectedSlots, [opt.slot]: opt.id };
    setSelectedSlots(newSlots);

    // If all 3 slots filled, check logic
    const filledCount = Object.keys(newSlots).length;
    if (filledCount === 3) {
      // Check correctness
      const opt1 = data.bank.find((o) => o.id === newSlots[1]);
      const opt2 = data.bank.find((o) => o.id === newSlots[2]);
      const opt3 = data.bank.find((o) => o.id === newSlots[3]);

      const wrong = [opt1, opt2, opt3].find((o) => o && o.trap);
      if (wrong) {
        setWrongOption(wrong);
        setGameStatus('FAILURE');
      } else {
        setWrongOption(null);
        setGameStatus('SUCCESS');
      }
    } else {
      // Auto move focus to next empty slot
      const nextSlot = [1, 2, 3].find((s) => !newSlots[s]);
      if (nextSlot) setActiveSlotToFill(nextSlot);
    }
  };

  const handleRedo = () => {
    setSelectedSlots({});
    setActiveSlotToFill(1);
    setWrongOption(null);
    setGameStatus('PLAYING');
  };

  const filledCount = Object.keys(selectedSlots).length;

  return (
    <div className={styles.container}>
      {/* ── TOP HEADER (Full-width wrapper) ── */}
      <div className={styles.headerWrapper}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <Link href="/dashboard" className={styles.brand}>
              <span className={styles.brandIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </span>
              <span>Programming <span style={{ color: 'var(--ds-violet)' }}>EDU</span></span>
            </Link>
          </div>

          <nav className={styles.headerNav}>
            <Link href="/dashboard" className={`${styles.navBtn} ${styles.navBtnActive}`}>
              Bản đồ
            </Link>
            <Link href="/ide" className={styles.navBtn}>
              Bàn thí nghiệm
            </Link>
            <span className={styles.navBtn}>Đấu trường</span>
          </nav>

          <div className={styles.headerStats}>
            <span className={styles.streak} title="Chuỗi học tập">
              🔥 {data.streak}
            </span>
            <span className={styles.xp} title="Kinh nghiệm tích luỹ">
              ⚡ {data.xp}
            </span>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label="Đổi giao diện sáng / tối"
              title="Đổi giao diện"
            >
              <svg className={styles.moon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
              <svg className={styles.sun} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            </button>
          </div>
        </header>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <main className={styles.main}>
        <div className={styles.taskDesc}>{data.title}</div>

        {/* ── CODE EDITOR CARD (main.py) ── */}
        <div className={styles.codeCard}>
          <div className={styles.codeHeader}>
            <div className={styles.windowDots}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.filename}>{data.filename}</span>
            </div>
            <div className={styles.langTag}>{data.langTag}</div>
          </div>

          <div className={styles.codeBody}>
            {data.templateLines.map((lineText, idx) => {
              const lineNum = idx + 1;
              const hasSlot1 = lineText.includes('{{slot1}}');
              const hasSlot2 = lineText.includes('{{slot2}}');
              const hasSlot3 = lineText.includes('{{slot3}}');

              const renderSlot = (slotNum: number) => {
                const optId = selectedSlots[slotNum];
                const opt = data.bank.find((o) => o.id === optId);
                const isSelected = !!opt;
                const isError = gameStatus === 'FAILURE' && opt?.trap !== undefined;
                const isCorrect = gameStatus === 'SUCCESS';

                let slotClass = styles.slotZone;
                if (isSelected) slotClass += ` ${styles.slotFilled}`;
                if (activeSlotToFill === slotNum && !isSelected) slotClass += ` ${styles.slotZoneActive}`;
                if (isError) slotClass += ` ${styles.slotError}`;
                if (isCorrect) slotClass += ` ${styles.slotCorrect}`;

                return (
                  <button
                    key={slotNum}
                    type="button"
                    className={slotClass}
                    onClick={() => {
                      if (gameStatus === 'PLAYING') {
                        setActiveSlotToFill(slotNum);
                      }
                    }}
                  >
                    <span className={styles.slotBadge}>{slotNum}</span>
                    <span>
                      {opt ? opt.label : data.slots[slotNum].placeholder}
                    </span>
                  </button>
                );
              };

              if (hasSlot1) {
                const parts = lineText.split('{{slot1}}');
                return (
                  <div key={lineNum} className={styles.codeLine}>
                    <span className={styles.lineNum}>{lineNum}</span>
                    <span className={styles.codeText}>{parts[0]}</span>
                    {renderSlot(1)}
                    <span className={styles.codeText}>{parts[1]}</span>
                  </div>
                );
              }

              if (hasSlot2) {
                const parts = lineText.split('{{slot2}}');
                return (
                  <div key={lineNum} className={styles.codeLine}>
                    <span className={styles.lineNum}>{lineNum}</span>
                    <span className={styles.codeText}>{parts[0]}</span>
                    {renderSlot(2)}
                    <span className={styles.codeText}>{parts[1]}</span>
                  </div>
                );
              }

              if (hasSlot3) {
                const parts = lineText.split('{{slot3}}');
                return (
                  <div key={lineNum} className={styles.codeLine}>
                    <span className={styles.lineNum}>{lineNum}</span>
                    <span className={styles.codeText}>{parts[0]}</span>
                    {renderSlot(3)}
                    <span className={styles.codeText}>{parts[1]}</span>
                  </div>
                );
              }

              return (
                <div key={lineNum} className={styles.codeLine}>
                  <span className={styles.lineNum}>{lineNum}</span>
                  <span className={styles.codeText}>{lineText}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── TRAY / FEEDBACK AREA ── */}
        <div className={styles.trayArea}>
          {/* Màn 2: Kho thẻ lựa chọn khi đang làm bài */}
          {gameStatus === 'PLAYING' && (
            <div className={styles.bankCard}>
              <div className={styles.bankHeader}>
                <div className={styles.bankTitle}>{data.eyebrow}</div>
                <div className={styles.bankCounter}>{filledCount}/3 ô</div>
              </div>
              <div className={styles.bankSubtitle}>
                Chọn một đoạn mã cho mỗi ô. Có cả đáp án đúng và đáp án gây nhiễu.
              </div>

              {[1, 2, 3].map((slotNum) => {
                const slotInfo = data.slots[slotNum];
                const options = data.bank.filter((o) => o.slot === slotNum);
                const currentChosen = selectedSlots[slotNum];

                return (
                  <div key={slotNum} className={styles.slotGroup}>
                    <div className={styles.slotGroupLabel}>
                      <span className={styles.slotBadge}>{slotNum}</span>
                      <span>{slotInfo.label}</span>
                    </div>
                    <div className={styles.optionsGrid}>
                      {options.map((opt) => {
                        const isChosen = currentChosen === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={`${styles.chipBtn} ${isChosen ? styles.chipSelected : ''}`}
                            onClick={() => handleSelectOption(opt)}
                          >
                            <span className={styles.chipHandle}>::</span>
                            <span>{opt.label}</span>
                            {isChosen && <span className={styles.chipStatus}>Đã chọn</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className={styles.bankFooterHint}>
                <span>✨</span>
                <span>Bấm chọn hoặc giữ tay nắm :: để thả mã vào đúng ô số tương ứng.</span>
              </div>
            </div>
          )}

          {/* Màn 3: Bảng kết quả ĐÚNG */}
          {gameStatus === 'SUCCESS' && (
            <div className={styles.successCard}>
              <div className={styles.feedbackHeader}>
                <div className={styles.successIcon}>✓</div>
                <div className={styles.feedbackTitleBlock}>
                  <h3 className={styles.feedbackTitle}>Chúc mừng! Bạn đã làm đúng.</h3>
                  <div className={styles.feedbackSubtitle}>
                    Cả 3 đoạn mã đều chính xác. Cùng xem lại vì sao nhé.
                  </div>
                </div>
                <div className={styles.feedbackBadge}>3 / 3 đúng</div>
              </div>

              <div className={styles.explanationList}>
                {data.successExplanations.map((exp) => (
                  <div key={exp.slotNumber} className={styles.explanationItem}>
                    <div className={styles.explanationHeader}>
                      <span className={styles.slotBadge}>{exp.slotNumber}</span>
                      <span className={styles.explanationCode}>{exp.code}</span>
                    </div>
                    <div className={styles.explanationText}>{exp.explanation}</div>
                  </div>
                ))}
              </div>

              <div className={styles.feedbackFooter}>
                <span className={styles.readyText}>Sẵn sàng cho phần tiếp theo?</span>
                <Link href="/dashboard" className={styles.nextBtn}>
                  Tiếp theo / Next &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Màn 4: Bảng kết quả SAI */}
          {gameStatus === 'FAILURE' && wrongOption && (
            <div className={styles.failureCard}>
              <div className={styles.feedbackHeader}>
                <div className={styles.failureIcon}>✕</div>
                <div className={styles.feedbackTitleBlock}>
                  <h3 className={styles.feedbackTitle}>Chưa đúng rồi. Thử lại nhé!</h3>
                  <div className={styles.feedbackSubtitle}>
                    Ô <span className={styles.slotBadge}>{wrongOption.slot}</span> đang dùng phép so sánh hoặc câu lệnh không phù hợp.
                  </div>
                </div>
                <div className={styles.failureBadge}>2 / 3 đúng</div>
              </div>

              <div className={styles.failureChosen}>
                <span>Bạn đã chọn:</span>
                <span className={styles.failureCodeChip}>{wrongOption.label}</span>
              </div>

              <div className={styles.failureExplanation}>{wrongOption.trap}</div>

              <div className={styles.failureFooter}>
                <span className={styles.readyText}>Làm lại để đặt lại các ô và chọn lại mã.</span>
                <button type="button" className={styles.redoBtn} onClick={handleRedo}>
                  Làm lại / Redo ↻
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footnote}>Phần kết được bổ sung: return chain.</div>
      </main>

      {/* ── FOOTER NAV ── */}
      <footer className={styles.footerNav}>
        <Link href="/dashboard" className={styles.footerBtn}>
          Back
        </Link>
        <span className={styles.footerStep}>
          {data.stepCurrent}/{data.stepTotal}
        </span>
        <button
          type="button"
          className={styles.footerBtn}
          onClick={() => {
            if (gameStatus === 'SUCCESS') {
              window.location.href = '/dashboard';
            }
          }}
        >
          Next
        </button>
      </footer>
    </div>
  );
}

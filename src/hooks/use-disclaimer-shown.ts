import { useEffect, useState } from "react";

const STORAGE_KEY = "confesta:disclaimer-shown";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeShown() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

/**
 * 청중 면책 안내 모달 표시 여부.
 * 확인 버튼을 누르면 localStorage에 기록하고 다시 보이지 않음.
 */
export function useDisclaimerShown() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(readStored());
  }, []);

  const markShown = () => {
    writeShown();
    setShown(true);
  };

  return { shown, markShown };
}

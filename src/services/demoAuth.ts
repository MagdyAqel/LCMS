import { demoAccounts } from "../data/demoAccounts";
import type { AppUser, UserRole } from "../types";
import { normalizeUsername } from "../utils/username";

const SESSION_KEY = "lcms.demo.session";
const ACCOUNTS_KEY = "lcms.demo.accounts";

type DemoStoredAccount = {
  uid: string;
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  contactEmail: string;
  disabled?: boolean;
};

function accountToUser(account: DemoStoredAccount): AppUser {
  return {
    uid: account.uid,
    email: "",
    username: account.username,
    contactEmail: account.contactEmail,
    displayName: account.displayName,
    role: account.role,
    disabled: Boolean(account.disabled),
    photoURL: null,
  };
}

function builtInAccounts(): DemoStoredAccount[] {
  return demoAccounts.map((account) => ({
    uid: `demo-${account.username}`,
    username: account.username,
    password: account.password,
    displayName: account.displayName,
    role: account.role,
    contactEmail: account.contactEmail,
    disabled: false,
  }));
}

function readExtraAccounts(): DemoStoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as DemoStoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeExtraAccounts(accounts: DemoStoredAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function isDemoUser(user: AppUser | null | undefined) {
  return Boolean(user?.uid.startsWith("demo-"));
}

export function getDemoAccounts() {
  const seen = new Set<string>();
  return [...builtInAccounts(), ...readExtraAccounts()].filter((account) => {
    if (seen.has(account.username)) {
      return false;
    }
    seen.add(account.username);
    return true;
  });
}

export function getDemoUsers() {
  return getDemoAccounts().map(accountToUser);
}

export function getDemoSession() {
  try {
    const username = localStorage.getItem(SESSION_KEY);
    if (!username) {
      return null;
    }

    const account = getDemoAccounts().find((item) => item.username === username);
    return account ? accountToUser(account) : null;
  } catch {
    return null;
  }
}

export function signInDemo(username: string, password: string) {
  const normalized = normalizeUsername(username);
  const account = getDemoAccounts().find(
    (item) => item.username === normalized && item.password === password,
  );

  if (!account || account.disabled) {
    return null;
  }

  localStorage.setItem(SESSION_KEY, account.username);
  return accountToUser(account);
}

export function signOutDemo() {
  localStorage.removeItem(SESSION_KEY);
}

export function registerDemoAccount(input: {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  contactEmail?: string;
  disabled?: boolean;
}) {
  const username = normalizeUsername(input.username);
  if (username.length < 3) {
    throw new Error("اسم المستخدم يجب أن يكون 3 أحرف على الأقل.");
  }

  if (input.password.length < 6) {
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
  }

  if (getDemoAccounts().some((account) => account.username === username)) {
    throw new Error("اسم المستخدم مستخدم بالفعل.");
  }

  const account: DemoStoredAccount = {
    uid: `demo-${username}`,
    username,
    password: input.password,
    displayName: input.displayName,
    role: input.role,
    contactEmail: input.contactEmail ?? "",
    disabled: input.disabled,
  };

  writeExtraAccounts([...readExtraAccounts(), account]);
  return accountToUser(account);
}

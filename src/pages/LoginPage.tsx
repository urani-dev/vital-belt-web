import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, type AuthErrorKind } from "../store/auth";

const ERROR_TEXT: Record<AuthErrorKind, string> = {
  invalidCredential: "メールアドレスまたはパスワードが正しくありません", // Sai email hoặc mật khẩu
  tooManyRequests: "試行回数が多すぎます。しばらくしてから再度お試しください", // Thử quá nhiều lần, đợi rồi thử lại
  network: "ネットワークに接続できません", // Không kết nối được mạng
  unknown: "ログインできませんでした。時間をおいて再度お試しください", // Không đăng nhập được, thử lại sau
};

/** F12 — ログイン (Firebase Authentication). */
export function LoginPage() {
  const user = useAuth((s) => s.user);
  const login = useAuth((s) => s.login);
  const resetPassword = useAuth((s) => s.resetPassword);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  if (user) return <Navigate to={from} replace />;

  const signIn = async (address: string, secret: string) => {
    setNotice(null);
    setError(null);
    setPending(true);
    const failure = await login(address, secret);
    setPending(false);
    if (failure) setError(ERROR_TEXT[failure]);
    else navigate(from, { replace: true });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void signIn(email, password);
  };

  const requestReset = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("メールアドレスを入力してください"); // Hãy nhập email
      return;
    }
    const failure = await resetPassword(email);
    // Không tiết lộ email có tồn tại hay không: chỉ báo lỗi mạng / quá số lần.
    if (failure === "network" || failure === "tooManyRequests") setError(ERROR_TEXT[failure]);
    else setNotice("登録済みのアドレスであれば、再設定メールを送信しました。"); // Nếu email đã đăng ký thì đã gửi mail đặt lại mật khẩu
  };

  const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink";
  return (
    <main className="flex min-h-full items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-panel p-8 shadow-sm" noValidate>
        <p className="text-center text-xl font-bold tracking-[0.2em]">VITAL BELT</p>
        <p className="mt-1 text-center text-xs text-muted">管理者ビュー</p>
        <label className="mt-8 block text-xs font-medium">
          メールアドレス
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="mt-4 block text-xs font-medium">
          パスワード
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </label>
        {error && <p role="alert" className="mt-3 text-xs text-priority">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-md bg-ink py-2.5 text-sm font-medium text-white hover:brightness-125 disabled:opacity-60"
        >
          {pending ? "ログイン中…" : "ログイン"}
        </button>
        {__DEV_LOGIN__ && (
          <button
            type="button"
            disabled={pending}
            onClick={() => __DEV_LOGIN__ && void signIn(__DEV_LOGIN__.email, __DEV_LOGIN__.password)}
            className="mt-2 w-full rounded-md border border-dashed border-line py-2 text-xs text-muted hover:bg-subtle disabled:opacity-60"
            title={__DEV_LOGIN__.email}
          >
            {/* Đăng nhập nhanh bằng tài khoản demo — chỉ hiện ở môi trường dev */}
            デモアカウントでログイン（開発用）
          </button>
        )}
        <button type="button" onClick={requestReset} className="mt-3 block w-full text-center text-[11px] text-muted hover:underline">
          パスワードをお忘れの方
        </button>
        {notice && <p role="status" className="mt-2 text-center text-[11px] text-muted">{notice}</p>}
      </form>
    </main>
  );
}

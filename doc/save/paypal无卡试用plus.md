pp 无卡试用 gpt plus 细节总结

【窗口1】首先，用jp等地的代理，注册账号并触发 plus 试用资格，然后点击0试用后，控制台执行长链接代码（放最后了，构建的是us，根据情况改，下面以us为例），得到长链接

1621 Elswick Lane,Charlotte,28214
7714 Legacy Ln, Orlando, FL 32818
2922 E Le Marche Ave, Phoenix, AZ 85032 <–常用，通过率高
1586 29th Ave, San Francisco, CA 94122
2671 Clayton Oaks Dr, Dallas, TX 75227
1621 elswick ln,Charlotte,28214


【窗口2】us代理新的浏览器环境打开长链接后，输入上述地址，等弹出自动填写，点击它

跳转到 PayPal，创建账号，邮箱随便填

付款信息信息页面，邮箱填注册的gpt邮箱，0刀卡就行，没有扣款验证

接码后会跳转到 PayPal add card，不用再去添加卡了，直接同意（这一步就是pp无卡），等待跳转回 chatgpt.com

【窗口1】回到第一个窗口，刷新后等一会，就可以看见 plus 试用了


长链接的获取代码

(async function generatePlusHostedLink() {
  console.log("⏳ [plus-link] 正在获取 Session Token...");

  // ── 1. 获取当前登录的 Access Token ──────────────────────────────────────
  let accessToken;
  try {
    const session = await fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json());
    accessToken = session?.accessToken;
    if (!accessToken) throw new Error("accessToken 为空");
  } catch (e) {
    console.error("❌ [plus-link] 获取 Token 失败，请确保已登录 ChatGPT：", e.message);
    return;
  }
  console.log("✅ [plus-link] Token 获取成功");

  // ── 2. 构造请求 Payload ──────────────────────────────────────────────────
  // plan_name        : chatgptplusplan（Plus 个人计划）
  // promo_campaign   : plus-1-month-free（首月免费试用活动，可选）
  // checkout_ui_mode : hosted（让 OpenAI 返回 Stripe Hosted URL 长链接）
  // billing_details  : 根据你的地区修改 country / currency

  const payload = {
    plan_name: "chatgptplusplan",

    billing_details: {
      country: "US",       // ← 根据需要改：US/JP/KR/DE/ID 等
      currency: "USD",     // ← 对应币种：USD/JPY/KRW/EUR/IDR 等
    },

    cancel_url: "https://chatgpt.com/#pricing",

    // 🔥 首月免费试用优惠（如不需要可删除整个 promo_campaign 块）
    promo_campaign: {
      promo_campaign_id: "plus-1-month-free",
      is_coupon_from_query_param: false,
    },

    checkout_ui_mode: "hosted",
  };

  // ── 3. 发送请求 ──────────────────────────────────────────────────────────
  console.log("⏳ [plus-link] 正在请求 Stripe 长链接...");
  let data;
  try {
    const response = await fetch(
      "https://chatgpt.com/backend-api/payments/checkout",
      {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: Bearer ${accessToken},
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    data = await response.json();

    if (!response.ok) {
      console.error("❌ [plus-link] 请求失败，HTTP", response.status);
      console.error(data);
      return;
    }
  } catch (e) {
    console.error("❌ [plus-link] 网络请求异常：", e.message);
    return;
  }

  // ── 4. 输出结果 ──────────────────────────────────────────────────────────
  const hostedUrl = data?.url  data?.stripe_hosted_url  data?.checkout_url;

  if (!hostedUrl) {
    console.warn("⚠️ [plus-link] 未找到长链接，原始响应如下：");
    console.log(data);
    return;
  }

  console.log("─".repeat(60));
  console.log("✅ [plus-link] 生成成功！");
  console.log("");
  console.log("📋 Checkout Session ID :", data.checkout_session_id);
  console.log("🏷  Processor Entity   :", data.processor_entity);
  console.log("🌟 Plan                : ChatGPT Plus");
  console.log("");
  console.log("🔗 Stripe 长链接（直接打开即可支付）：");
  console.log(hostedUrl);
  console.log("─".repeat(60));
  console.log("💡 提示：打开链接后检查价格是否已套用优惠");
})();
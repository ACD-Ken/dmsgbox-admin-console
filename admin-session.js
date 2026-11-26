(() => {
    const url = 'https://bjpwckpmktnwtdzpmnvn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHdja3Bta3Rud3RkenBtbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMDc1NTAsImV4cCI6MjA5MjU4MzU1MH0.BMHQDBEANQdZhm4_62Jh9sewdZnAxOZzvKcZCPUoDd0';
    const client = window.supabase.createClient(url, SUPABASE_ANON_KEY);

    function signInUrl(destination) {
        const mode = destination === 'approvals' ? 'approvals' : 'devices';
        return '/site/DMB/admin-login.html?console=' + mode;
    }

    async function checkAdminSession() {
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) return { state: 'signed-out' };
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) return { state: 'signed-out' };
        if (!user.email_confirmed_at) return { state: 'forbidden' };

        const { data: role, error: roleError } = await client.from('admin_console_users')
            .select('role').eq('email', user.email).maybeSingle();
        if (roleError) throw roleError;
        if (role?.role !== 'admin') return { state: 'forbidden' };
        const { data: levels, error: mfaError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaError) throw mfaError;
        if (levels?.currentLevel !== 'aal2' || levels?.nextLevel !== 'aal2') return { state: 'mfa' };
        return { user, state: 'ready' };
    }

    window.dmsgboxAdmin = { client, checkAdminSession, signInUrl };
})();

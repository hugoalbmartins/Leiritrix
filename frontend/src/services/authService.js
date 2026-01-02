import { supabase } from '@/lib/supabase';

export const authService = {
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email ou password incorretos. Verifique as credenciais e tente novamente.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Email não confirmado. Verifique a sua caixa de entrada.');
        }
        if (error.message.includes('Invalid API key')) {
          console.error('Erro de API Key - Verifique as variáveis de ambiente no Vercel');
          throw new Error('Erro de configuração. Contacte o administrador.');
        }
        throw error;
      }

      const userProfile = await this.getUserProfile(data.user.id);
      return { user: userProfile, session: data.session };
    } catch (error) {
      console.error('Erro no login:', {
        message: error.message,
        details: error,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Configurado' : 'NÃO configurado',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurado' : 'NÃO configurado'
      });
      throw error;
    }
  },

  async signUp(email, password, userData) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    if (authData.user) {
      const insertData = {
        id: authData.user.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'vendedor',
        active: true,
        must_change_password: userData.must_change_password || false,
      };

      if (userData.commission_percentage !== undefined) {
        insertData.commission_percentage = userData.commission_percentage;
      }
      if (userData.commission_threshold !== undefined) {
        insertData.commission_threshold = userData.commission_threshold;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([insertData])
        .select()
        .single();

      if (profileError) throw profileError;
      return { user: profileData, session: authData.session };
    }

    throw new Error('Failed to create user');
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const userProfile = await this.getUserProfile(session.user.id);
    return userProfile;
  },

  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async changePassword(currentPassword, newPassword) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) throw new Error('Password atual incorreta');

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) throw updateError;

    const { error: profileError } = await supabase
      .from('users')
      .update({ must_change_password: false })
      .eq('id', user.id);

    if (profileError) throw profileError;

    return true;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          try {
            const userProfile = await this.getUserProfile(session.user.id);
            callback(event, session, userProfile);
          } catch (error) {
            console.error('Error fetching user profile:', error);
            callback(event, session, null);
          }
        } else {
          callback(event, session, null);
        }
      })();
    });
  },
};

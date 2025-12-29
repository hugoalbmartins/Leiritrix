import { supabase } from '@/lib/supabase';

export const authService = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const userProfile = await this.getUserProfile(data.user.id);
    return { user: userProfile, session: data.session };
  },

  async signUp(email, password, userData) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    if (authData.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: userData.email,
            name: userData.name,
            role: userData.role || 'vendedor',
            active: true,
            must_change_password: userData.must_change_password || false,
          },
        ])
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

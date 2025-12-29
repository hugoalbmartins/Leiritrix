import { supabase } from "@/lib/supabase";

export const notificationsService = {
  async getNotifications(userId) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) throw error;
    return count || 0;
  },

  async markAsRead(notificationId) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) throw error;
  },

  async markAllAsRead(userId) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) throw error;
  },

  async createNotification(userId, title, message, type, saleId = null) {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title,
        message,
        type,
        sale_id: saleId,
        read: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createSaleNotifications(sale, type = "sale_created") {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, role")
      .eq("active", true)
      .in("role", ["admin", "backoffice"]);

    if (usersError) throw usersError;

    const notifications = [];

    if (type === "sale_created") {
      for (const user of users) {
        notifications.push({
          user_id: user.id,
          title: "Nova venda registada",
          message: `Nova venda criada: ${sale.client_name} - ${sale.category}`,
          type: "sale_created",
          sale_id: sale.id,
          read: false
        });
      }

      if (sale.seller_id && !users.some(u => u.id === sale.seller_id)) {
        notifications.push({
          user_id: sale.seller_id,
          title: "Nova venda registada",
          message: `A sua venda foi registada: ${sale.client_name}`,
          type: "sale_created",
          sale_id: sale.id,
          read: false
        });
      }
    } else if (type === "sale_status_changed") {
      for (const user of users) {
        notifications.push({
          user_id: user.id,
          title: "Estado de venda alterado",
          message: `Venda ${sale.client_name} agora está: ${sale.status}`,
          type: "sale_status_changed",
          sale_id: sale.id,
          read: false
        });
      }

      if (sale.seller_id && !users.some(u => u.id === sale.seller_id)) {
        notifications.push({
          user_id: sale.seller_id,
          title: "Estado da sua venda alterado",
          message: `A venda ${sale.client_name} agora está: ${sale.status}`,
          type: "sale_status_changed",
          sale_id: sale.id,
          read: false
        });
      }
    }

    if (notifications.length > 0) {
      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;
    }

    return notifications;
  },

  subscribeToNotifications(userId, callback) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};

import {
  initAuthCreds,
  BufferJSON,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataSet,
  type SignalDataTypeMap
} from '@whiskeysockets/baileys';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function useSupabaseAuthState(
  supabase: SupabaseClient,
  sessionId: string = 'engine-primary'
): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearSession: () => Promise<void>;
}> {
  // 1. Ambil Kredensial Utama dari Supabase
  let creds: AuthenticationCreds;

  const { data: credsRow, error: credsErr } = await supabase
    .from('baileys_auth_store')
    .select('value')
    .eq('session_id', sessionId)
    .eq('key_id', 'creds')
    .maybeSingle();

  if (credsErr) {
    console.warn(`[SupabaseAuth] Gagal membaca creds dari Supabase: ${credsErr.message}`);
  }

  if (credsRow && credsRow.value) {
    try {
      creds = JSON.parse(JSON.stringify(credsRow.value), BufferJSON.reviver);
      console.log(`[SupabaseAuth] Sesi kredensial "${sessionId}" berhasil dimuat dari Supabase!`);
    } catch (e) {
      console.error('[SupabaseAuth] Gagal parse kredensial Supabase, generate baru:', e);
      creds = initAuthCreds();
    }
  } else {
    console.log(`[SupabaseAuth] Belum ada sesi di Supabase untuk "${sessionId}". Membuat kredensial baru...`);
    creds = initAuthCreds();
  }

  // 2. Fungsi Simpan Kredensial ke Supabase
  const saveCreds = async (): Promise<void> => {
    try {
      const serialized = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
      const { error } = await supabase
        .from('baileys_auth_store')
        .upsert(
          {
            session_id: sessionId,
            key_id: 'creds',
            value: serialized,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'session_id,key_id' }
        );

      if (error) {
        console.error('[SupabaseAuth] Gagal menyimpan creds ke Supabase:', error.message);
      }
    } catch (err) {
      console.error('[SupabaseAuth] Error serialization creds:', err);
    }
  };

  // 3. Signal Key Store Adapter
  const keys = {
    get: async <T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[]
    ): Promise<{ [key: string]: SignalDataTypeMap[T] }> => {
      const result: { [key: string]: SignalDataTypeMap[T] } = {};
      if (!ids.length) return result;

      const keyIds = ids.map((id) => `${type}-${id}`);

      try {
        const { data: rows, error } = await supabase
          .from('baileys_auth_store')
          .select('key_id, value')
          .eq('session_id', sessionId)
          .in('key_id', keyIds);

        if (error) {
          console.warn(`[SupabaseAuth] Gagal get keys (${type}):`, error.message);
          return result;
        }

        if (rows) {
          for (const row of rows) {
            const rawId = row.key_id.replace(`${type}-`, '');
            try {
              let val = JSON.parse(JSON.stringify(row.value), BufferJSON.reviver);
              if (type === 'app-state-sync-key' && val) {
                val = proto.Message.AppStateSyncKeyData.fromObject(val);
              }
              result[rawId] = val;
            } catch (err) {
              console.warn(`[SupabaseAuth] Gagal decode key ${row.key_id}:`, err);
            }
          }
        }
      } catch (err) {
        console.error('[SupabaseAuth] Error query keys:', err);
      }

      return result;
    },

    set: async (data: SignalDataSet): Promise<void> => {
      const upsertItems: Array<{
        session_id: string;
        key_id: string;
        value: any;
        updated_at: string;
      }> = [];
      const deleteKeyIds: string[] = [];

      for (const [type, idDict] of Object.entries(data)) {
        for (const [id, value] of Object.entries(idDict || {})) {
          const keyId = `${type}-${id}`;
          if (value === null || value === undefined) {
            deleteKeyIds.push(keyId);
          } else {
            upsertItems.push({
              session_id: sessionId,
              key_id: keyId,
              value: JSON.parse(JSON.stringify(value, BufferJSON.replacer)),
              updated_at: new Date().toISOString()
            });
          }
        }
      }

      if (upsertItems.length > 0) {
        const { error } = await supabase
          .from('baileys_auth_store')
          .upsert(upsertItems, { onConflict: 'session_id,key_id' });

        if (error) {
          console.error('[SupabaseAuth] Gagal upsert keys:', error.message);
        }
      }

      if (deleteKeyIds.length > 0) {
        const { error } = await supabase
          .from('baileys_auth_store')
          .delete()
          .eq('session_id', sessionId)
          .in('key_id', deleteKeyIds);

        if (error) {
          console.error('[SupabaseAuth] Gagal delete keys:', error.message);
        }
      }
    }
  };

  // 4. Bersihkan Sesi jika Terlogout
  const clearSession = async (): Promise<void> => {
    try {
      console.log(`[SupabaseAuth] Membersihkan seluruh data sesi "${sessionId}" dari Supabase...`);
      const { error } = await supabase
        .from('baileys_auth_store')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        console.error('[SupabaseAuth] Gagal membersihkan sesi Supabase:', error.message);
      }
    } catch (err) {
      console.error('[SupabaseAuth] Error clearSession:', err);
    }
  };

  return {
    state: {
      creds,
      keys
    },
    saveCreds,
    clearSession
  };
}

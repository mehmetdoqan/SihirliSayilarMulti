-- Sihirli Sayılar — Çözüm Atlası sürümü sunucu yaması
-- database.sql ve supabase-completion-patch.sql'den SONRA, Supabase SQL Editor'de bir kez çalıştırın.
-- Tekrar çalıştırmak güvenlidir.
--
-- Ne değişir?
--  1. Parça şekilleri sunucuda doğrulanır: tam 6 parça (Z, Kare, P, T, I, L), her biri kendi
--     şeklinin 8 yöneliminden biri olmak zorunda. (README'deki "bilinen sınır" kapandı.)
--  2. Süre kontrolü geri geldi: tur süresi (+5 sn tolerans) dolduktan sonra sonuç kabul edilmez.
--  3. İlk tamamlayan kazanan olarak kaydedilir; oda yine herkes bitirene kadar açık kalır.
--  4. Süresi dolan tur, oda durumu sorgulanınca otomatik olarak "finished" olur.
--  5. Biten odada oda sahibi yeni hedef sayı seçerek yeni tur hazırlayabilir.

create table if not exists public.sihiri_piece_shapes (
  piece text not null,
  shape text not null,
  primary key (piece, shape)
);
alter table public.sihiri_piece_shapes enable row level security;
revoke all on public.sihiri_piece_shapes from anon, authenticated;

insert into public.sihiri_piece_shapes(piece, shape) values
  ('Z','0,0;0,1;1,1;1,2'),
  ('Z','0,1;1,0;1,1;2,0'),
  ('Z','0,1;0,2;1,0;1,1'),
  ('Z','0,0;1,0;1,1;2,1'),
  ('Kare','0,0;0,1;1,0;1,1'),
  ('P','0,0;0,1;1,0;1,1;2,0'),
  ('P','0,0;0,1;0,2;1,1;1,2'),
  ('P','0,1;1,0;1,1;2,0;2,1'),
  ('P','0,0;0,1;1,0;1,1;1,2'),
  ('P','0,0;0,1;1,0;1,1;2,1'),
  ('P','0,1;0,2;1,0;1,1;1,2'),
  ('P','0,0;1,0;1,1;2,0;2,1'),
  ('P','0,0;0,1;0,2;1,0;1,1'),
  ('T','0,0;0,1;0,2;1,1'),
  ('T','0,1;1,0;1,1;2,1'),
  ('T','0,1;1,0;1,1;1,2'),
  ('T','0,0;1,0;1,1;2,0'),
  ('I','0,0;1,0;2,0'),
  ('I','0,0;0,1;0,2'),
  ('L','0,0;1,0;2,0;2,1'),
  ('L','0,0;0,1;0,2;1,0'),
  ('L','0,0;0,1;1,1;2,1'),
  ('L','0,2;1,0;1,1;1,2'),
  ('L','0,1;1,1;2,0;2,1'),
  ('L','0,0;1,0;1,1;1,2'),
  ('L','0,0;0,1;1,0;2,0'),
  ('L','0,0;0,1;0,2;1,2')
on conflict do nothing;

-- Tahtayı doğrular; boş hücrenin cevap etiketini döndürür ("1".."24" veya "center").
create or replace function public.sihiri_validate_board(p_board_state jsonb)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_pieces jsonb := coalesce(p_board_state->'pieces', '{}'::jsonb);
  v_key text; v_val jsonb; v_shape text; v_r int; v_c int; v_idx int;
  v_seen boolean[] := array_fill(false, array[25]);
  v_count int := 0; v_empty int;
begin
  if jsonb_typeof(v_pieces) <> 'object' then raise exception 'Tahta verisi geçersiz.'; end if;
  if (select count(*) from jsonb_object_keys(v_pieces)) <> 6
     or exists (select 1 from jsonb_object_keys(v_pieces) k
                where k not in ('Z','Kare','P','T','I','L')) then
    raise exception 'Parça listesi geçersiz.';
  end if;

  for v_key, v_val in select key, value from jsonb_each(v_pieces) loop
    if v_val->'anchor' is null or jsonb_typeof(v_val->'anchor') <> 'object' then
      raise exception 'Önce 6 parçanın tamamını yerleştirin.';
    end if;
    if jsonb_typeof(v_val->'cells') <> 'array' then raise exception 'Parça verisi geçersiz.'; end if;

    -- Şekil: hücreleri sola-üste hizala, sırala ve izinli yönelimlerle karşılaştır.
    select string_agg((r - min_r) || ',' || (c - min_c), ';' order by r, c) into v_shape
    from (
      select (e->>0)::int r, (e->>1)::int c,
             min((e->>0)::int) over () min_r, min((e->>1)::int) over () min_c
      from jsonb_array_elements(v_val->'cells') e
    ) s;
    if not exists (select 1 from public.sihiri_piece_shapes where piece = v_key and shape = v_shape) then
      raise exception '% parçasının şekli geçersiz.', v_key;
    end if;

    for v_r, v_c in
      select (v_val->'anchor'->>'r')::int + (e->>0)::int, (v_val->'anchor'->>'c')::int + (e->>1)::int
      from jsonb_array_elements(v_val->'cells') e
    loop
      if v_r not between 0 and 4 or v_c not between 0 and 4 then
        raise exception 'Parça tahta dışına taşıyor.';
      end if;
      v_idx := v_r * 5 + v_c + 1;
      if v_seen[v_idx] then raise exception 'Parçalar çakışıyor.'; end if;
      v_seen[v_idx] := true; v_count := v_count + 1;
    end loop;
  end loop;

  if v_count <> 24 then raise exception 'Önce 24 hücrenin tamamını doldurun.'; end if;
  for v_idx in 1..25 loop if not v_seen[v_idx] then v_empty := v_idx - 1; exit; end if; end loop;
  return case when v_empty = 12 then 'center'
              when v_empty < 12 then (v_empty + 1)::text
              else v_empty::text end;
end $$;
revoke all on function public.sihiri_validate_board(jsonb) from public, anon, authenticated;

create or replace function public.sihiri_submit_result(
  p_code text, p_token text, p_answer text, p_board_state jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.sihiri_rooms; pl public.sihiri_players;
  v_actual text; v_target text; v_now timestamptz := clock_timestamp();
begin
  select * into r from public.sihiri_rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Oda bulunamadı.'; end if;
  if r.status <> 'playing' then raise exception 'Tur aktif değil.'; end if;

  select * into pl from public.sihiri_players
  where room_id = r.id and player_token = p_token for update;
  if not found then raise exception 'Oyuncu bulunamadı.'; end if;
  if pl.finished_at is not null then return public.sihiri_room_payload(r.id, p_token); end if;

  if v_now < r.starts_at then raise exception 'Tur henüz başlamadı.'; end if;
  if v_now > r.starts_at + make_interval(secs => r.duration_seconds + 5) then
    update public.sihiri_rooms set status = 'finished' where id = r.id;
    raise exception 'Süre doldu.';
  end if;

  v_actual := public.sihiri_validate_board(p_board_state);
  if p_answer is distinct from v_actual then raise exception 'Cevap tahtayla uyuşmuyor.'; end if;
  v_target := r.challenge->>'target_number';
  if v_target is not null and v_target <> v_actual then
    raise exception 'Hedef sayı boş hücre değil.';
  end if;

  update public.sihiri_players
  set submitted_answer = p_answer, board_state = p_board_state, finished_at = v_now
  where id = pl.id;
  update public.sihiri_rooms set winner_player_id = pl.id
  where id = r.id and winner_player_id is null;
  if not exists (select 1 from public.sihiri_players where room_id = r.id and finished_at is null) then
    update public.sihiri_rooms set status = 'finished' where id = r.id;
  end if;
  return public.sihiri_room_payload(r.id, p_token);
end $$;

create or replace function public.sihiri_room_state(p_code text, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.sihiri_rooms;
begin
  select * into r from public.sihiri_rooms where code = upper(trim(p_code));
  if r.id is null then raise exception 'Oda bulunamadı.'; end if;
  if r.status = 'playing' and r.starts_at is not null
     and now() > r.starts_at + make_interval(secs => r.duration_seconds + 5) then
    update public.sihiri_rooms set status = 'finished' where id = r.id and status = 'playing';
  end if;
  return public.sihiri_room_payload(r.id, p_token);
end $$;

create or replace function public.sihiri_set_challenge(p_code text, p_token text, p_challenge jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.sihiri_rooms;
begin
  select * into r from public.sihiri_rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Oda bulunamadı.'; end if;
  if r.host_token <> p_token then raise exception 'Bu işlem yalnızca oda sahibine açık.'; end if;
  if r.status = 'playing' then raise exception 'Tur başladıktan sonra hedef sayı değiştirilemez.'; end if;
  if coalesce((p_challenge->>'target_number')::integer, 0) not between 1 and 24 then
    raise exception 'Hedef sayı 1 ile 24 arasında olmalı.';
  end if;
  -- Biten odada yeni tur hazırlığı: oda yeniden "waiting" olur, yeni oyuncular katılabilir.
  update public.sihiri_rooms
  set challenge = p_challenge, status = 'waiting', starts_at = null, winner_player_id = null
  where id = r.id;
  update public.sihiri_players
  set finished_at = null, submitted_answer = null, board_state = '{}'::jsonb
  where room_id = r.id;
  return public.sihiri_room_payload(r.id, p_token);
end $$;

create or replace function public.sihiri_start_round(p_code text, p_token text, p_duration integer, p_challenge jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.sihiri_rooms;
begin
  select * into r from public.sihiri_rooms where code = upper(trim(p_code)) for update;
  if r.id is null then raise exception 'Oda bulunamadı.'; end if;
  if r.host_token <> p_token then raise exception 'Turu yalnızca oda sahibi başlatabilir.'; end if;
  if r.status <> 'waiting' then raise exception 'Tur zaten başladı veya bitti; önce yeni hedef sayı seçin.'; end if;
  if (select count(*) from public.sihiri_players where room_id = r.id) < 2 then
    raise exception 'Başlamak için en az 2 oyuncu gerekli.';
  end if;
  if p_duration not in (120,180,300) then raise exception 'Geçersiz süre.'; end if;
  if coalesce((r.challenge->>'target_number')::integer, 0) not between 1 and 24 then
    raise exception 'Önce hedef sayı seçin.';
  end if;
  -- Hedef, istemcinin gönderdiğinden değil, sunucuda kayıtlı olandan alınır.
  update public.sihiri_rooms
  set status = 'playing', duration_seconds = p_duration,
      starts_at = now() + interval '3 seconds', winner_player_id = null
  where id = r.id;
  update public.sihiri_players
  set board_state = '{}'::jsonb, submitted_answer = null, finished_at = null
  where room_id = r.id;
  return public.sihiri_room_payload(r.id, p_token);
end $$;

revoke all on function public.sihiri_submit_result(text,text,text,jsonb) from public;
revoke all on function public.sihiri_room_state(text,text) from public;
revoke all on function public.sihiri_set_challenge(text,text,jsonb) from public;
revoke all on function public.sihiri_start_round(text,text,integer,jsonb) from public;
grant execute on function public.sihiri_submit_result(text,text,text,jsonb) to anon, authenticated;
grant execute on function public.sihiri_room_state(text,text) to anon, authenticated;
grant execute on function public.sihiri_set_challenge(text,text,jsonb) to anon, authenticated;
grant execute on function public.sihiri_start_round(text,text,integer,jsonb) to anon, authenticated;

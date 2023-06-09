-- Update `vars` with the current channel & thread.
update vars set channel_id = $channel_id, thread_id = coalesce($thread_ts, $ts);

-- Upsert into `messages`.
insert into messages(channel_id, thread_id, msg_id, msg_text, user_id)
select v.channel_id, v.thread_id, $ts, $text, coalesce($user, 'bot') from vars v where 1
on conflict do update set msg_text = excluded.msg_text;

-- Publish updated representation of the thread.
select * from rich_thread;

-- Metadata for each user.
create table users (
    user_id text primary key not null,
    is_bot boolean not null,
    user_name text not null
) without rowid;

-- Metadata for each channel.
create table channels (
    channel_id text primary key not null,
    channel_name text not null,
    num_members integer not null,
    purpose text,
    topic text
) without rowid;

-- Messages and associated metadata.
create table messages (
    channel_id text not null,
    msg_id     text not null,
    thread_id  text not null,
    msg_text   text not null,
    user_id    text not null,

    -- Slack uses string-encoded Unix timestamps to represent message IDs.
    ts         float generated always as (cast(msg_id as float)) virtual,

    primary key (channel_id, msg_id)
);
create index idx_messages_thread_ts
    on messages (channel_id, thread_id, msg_id);


-- `vars` are variables used in a current message lambda execution.
-- It has a single row which is updated with each invocation.
create table vars (
    channel_id text,
    thread_id  text
);
insert into vars default values;


-- View which provides a rollup of the current thread.
create view rich_thread as
with rich_messages as (
    select m.*,
        u.user_name,
        c.channel_name
    from vars v
    join messages m on m.channel_id = v.channel_id and m.thread_id = v.thread_id
    left join users u on m.user_id = u.user_id
    left join channels c on m.channel_id = c.channel_id
    order by msg_id
)
select
    channel_id,
    thread_id,
    channel_name,
    min(ts) as start_ts,
    max(ts) as end_ts,
    count(*) as msg_count,
    json_group_array(json_object(
        'ts', ts,
        'user_id', user_id,
        'user_name', user_name,
        'text', msg_text
    )) as thread
from rich_messages
group by channel_id, thread_id
having msg_count > 2
;


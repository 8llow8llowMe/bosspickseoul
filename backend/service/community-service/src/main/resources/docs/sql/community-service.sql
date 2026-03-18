create table if not exists community_post (
    id bigint not null primary key,
    member_id bigint not null,
    target_type varchar(20) not null,
    target_code varchar(20) not null,
    target_name varchar(100) not null,
    title varchar(120) not null,
    content varchar(5000) not null,
    status varchar(20) not null,
    like_count bigint not null default 0,
    comment_count bigint not null default 0,
    created_at datetime(3) not null,
    updated_at datetime(3) not null,
    index idx_community_post_target_created (target_type, target_code, created_at),
    index idx_community_post_member_created (member_id, created_at),
    index idx_community_post_status_created (status, created_at)
);

create table if not exists community_comment (
    id bigint not null primary key,
    post_id bigint not null,
    member_id bigint not null,
    content varchar(1000) not null,
    status varchar(20) not null,
    like_count bigint not null default 0,
    created_at datetime(3) not null,
    updated_at datetime(3) not null,
    constraint fk_community_comment_post foreign key (post_id) references community_post (id),
    index idx_community_comment_post_created (post_id, created_at),
    index idx_community_comment_member_created (member_id, created_at)
);

create table if not exists community_post_like (
    id bigint not null primary key,
    post_id bigint not null,
    member_id bigint not null,
    created_at datetime(3) not null,
    constraint fk_community_post_like_post foreign key (post_id) references community_post (id),
    unique key uk_community_post_like_post_member (post_id, member_id),
    index idx_community_post_like_member (member_id)
);

create table if not exists community_comment_like (
    id bigint not null primary key,
    comment_id bigint not null,
    member_id bigint not null,
    created_at datetime(3) not null,
    constraint fk_community_comment_like_comment foreign key (comment_id) references community_comment (id),
    unique key uk_community_comment_like_comment_member (comment_id, member_id),
    index idx_community_comment_like_member (member_id)
);

create table if not exists community_report (
    id bigint not null primary key,
    target_kind varchar(20) not null,
    target_id bigint not null,
    reporter_member_id bigint not null,
    reason varchar(500) not null,
    created_at datetime(3) not null,
    unique key uk_community_report_target (target_kind, target_id, reporter_member_id),
    index idx_community_report_target (target_kind, target_id),
    index idx_community_report_reporter (reporter_member_id)
);

import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { IoMdHeart } from "react-icons/io";
import { IoBookmark } from "react-icons/io5";
import { FaTrash } from "react-icons/fa";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'

import LoadingSpinner from "./LoadingSpinner"
import { formatPostDate } from "../../utils/date";

const Post = ({ post }) => {
	const [comment, setComment] = useState("");
	const { data: authUser } = useQuery({ queryKey: ['authUser'] });
	const queryClient = useQueryClient();

	// delete post 
	const { mutate: deletePost, isPending: isDeleting } = useMutation({
		mutationFn: async () => {
			try {
				const res = await axios.delete(`api/posts/${post._id}`);
				return res.data;

			} catch (error) {
				throw new Error(error.response.data.error || "something went wrong");
			}
		},
		onSuccess: () => {
			toast.success('Post deleted successfully');
			queryClient.invalidateQueries({ queryKey: ["posts"] })
		},
		onError: (error) => {
			toast.error(error)
		}
	})

	// like/unlike post 
	const { mutate: likePost, isPending: isLiking } = useMutation({
		mutationFn: async () => {
			try {
				const res = await axios.post(`/api/posts/like/${post._id}`);
				return res.data;
			} catch (error) {
				throw new Error(error.response.data.error || error)
			}
		},
		onSuccess: (updatedLikes) => {
			queryClient.setQueryData(["posts"], (oldData) => {
				return oldData.map((p) => {
					if (p._id === post._id) {
						return { ...p, likes: updatedLikes };
					}
					return p;
				})
			})
		},
		onError: (error) => {
			toast.error(error.message)
		}
	})

	// comment on post
	const { mutate: commentPost, isPending: isCommenting } = useMutation({
		mutationFn: async (text) => {
			try {
				const res = await axios.post(`/api/posts/comment/${post._id}`, { text })
				return res.data;
			} catch (error) {
				throw new Error(error.response.data.error || "Something Went Wrong")
			}
		},
		onSuccess: async (updatedPost) => {
			await queryClient.setQueryData(["posts"], (oldData) => {
				return oldData.map((p) => {
					if (p._id === post._id) {
						return updatedPost;
					}
					return p;
				})
			})
			document.getElementById(`closeCommentModal${post._id}`).click();
			setComment("")
		},
		onError: (error) => {
			toast.error(error)
		}
	});

	// delete comment
	const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
		mutationFn: async (commentId) => {
			try {
				const res = await axios.delete(`/api/posts/${post._id}/${commentId}`);
				return res.data
			} catch (error) {
				throw new Error(error.response.data.error || "Something Went wrong")
			}
		},
		onSuccess: async (updatedPost) => {
			await queryClient.setQueryData(["posts"], (oldData) => {
				return oldData.map((p) => {
					if (p._id === post._id) {
						return updatedPost;
					}
					return p;
				})
			})
			document.getElementById(`closeCommentModal${post._id}`).click();
		},
		onError: (error) => {
			toast.error(error)
		}
	})

	const postOwner = post.user;
	const isLiked = post.likes?.includes(authUser._id);

	const isMyPost = authUser._id === post.user._id;
	const formattedDate = formatPostDate(post.createdAt);


	const handleDeletePost = () => {
		deletePost()
	};

	const handlePostComment = (e) => {
		e.preventDefault();
		if (isCommenting) return;
		commentPost(comment);
	};

	const handleDeleteComment = (commentId) => {
		if (isDeletingComment) return;
		deleteComment(commentId)
	}

	const handleLikePost = () => {
		if (isLiking) return;
		likePost();
	};

	return (
		<>
			<div className='flex gap-2 items-start p-4 border-b border-gray-700'>
				<div className='avatar'>
					<Link to={`/profile/${postOwner.username}`} className='w-8 rounded-full overflow-hidden'>
						<img src={postOwner.profileimg || "/avatar-placeholder.png"} />
					</Link>
				</div>
				<div className='flex flex-col flex-1'>
					<div className='flex gap-2 items-center'>
						<Link to={`/profile/${postOwner.username}`} className='font-bold'>
							{postOwner.fullname}
						</Link>
						<span className='text-gray-700 flex gap-1 text-sm'>
							<Link to={`/profile/${postOwner.username}`}>@{postOwner.username}</Link>
							<span>·</span>
							<span>{formattedDate}</span>
						</span>
						{isMyPost && (
							<span className='flex justify-end flex-1'>
								{isDeleting ?
									<LoadingSpinner size="loading-sm" /> :
									<FaTrash className='cursor-pointer hover:text-red-500' onClick={handleDeletePost} />}
							</span>
						)}
					</div>
					<div className='flex flex-col gap-3 overflow-hidden'>
						<span>{post.text}</span>
						{post.img && (
							<img
								src={post.img}
								className='h-80 object-contain rounded-lg border border-gray-700'
								alt=''
							/>
						)}
					</div>
					<div className='flex justify-between mt-3'>
						<div className='flex gap-4 items-center w-2/3 justify-between'>
							<div
								className='flex gap-1 items-center cursor-pointer group'
								onClick={() => document.getElementById("comments_modal" + post._id).showModal()}
							>
								<FaRegComment className='w-4 h-4  text-slate-500 group-hover:text-sky-400' />
								<span className='text-sm text-slate-500 group-hover:text-sky-400'>
									{post.comments.length}
								</span>
							</div>
							{/* We're using Modal Component from DaisyUI */}
							<dialog id={`comments_modal${post._id}`} className='modal border-none outline-none'>
								<div className='modal-box rounded border border-gray-600'>
									<h3 className='font-bold text-lg mb-4'>COMMENTS</h3>
									<div className='flex flex-col gap-3 max-h-60 overflow-auto'>
										{post.comments.length === 0 && (
											<p className='text-sm text-slate-500'>
												No comments yet 🤔 Be the first one 😉
											</p>
										)}
										{post.comments.map((comment) => (
											<div key={comment._id} className='flex gap-2 items-start'>
												<div className='avatar'>
													<div className='w-8 rounded-full'>
														<img
															src={comment.user.profileimg || "/avatar-placeholder.png"}
														/>
													</div>
												</div>
												<div className='flex flex-col'>
													<div className='flex flex-row items-center gap-1 w-full'>
														<span className='font-bold'>{comment.user.fullname}</span>
														<span className='text-gray-700 text-sm'>
															@{comment.user.username}
														</span>
														{(authUser._id === comment.user._id || authUser._id === post.user._id) && (
															<span className='absolute right-5'>
																{isDeletingComment ?
																	<span className="loading loading-Spinner loading-sm"></span> :
																	<FaTrash className='cursor-pointer hover:text-red-500' onClick={() => handleDeleteComment(comment._id)} />}
															</span>
														)}
													</div>
													<div className='text-sm'>{comment.text}</div>
												</div>
											</div>
										))}
									</div>
									<form
										className='flex gap-2 items-center mt-4 border-t border-gray-600 pt-2'
										onSubmit={handlePostComment}
									>
										<textarea
											className='textarea w-full p-1 rounded text-md resize-none border focus:outline-none  border-gray-800'
											placeholder='Add a comment...'
											value={comment}
											onChange={(e) => setComment(e.target.value)}
										/>
										<button className='btn btn-primary rounded-full btn-sm text-white px-4'>
											{isCommenting ? (
												<span className='loading loading-spinner loading-md'></span>
											) : (
												"Post"
											)}
										</button>
									</form>
								</div>
								<form method='dialog' className='modal-backdrop'>
									<button className='outline-none' id={`closeCommentModal${post._id}`}>close</button>
								</form>
							</dialog>
							<div className='flex gap-1 items-center group cursor-pointer'>
								<BiRepost className='w-6 h-6  text-slate-500 group-hover:text-green-500' />
								<span className='text-sm text-slate-500 group-hover:text-green-500'>0</span>
							</div>
							<div className='flex gap-1 items-center group cursor-pointer' onClick={handleLikePost}>
								{isLiking && <span className="loading loading-spinner loading-xs"></span>}
								{!isLiked && !isLiking && (
									<IoMdHeart className='w-4 h-4 cursor-pointer text-slate-500 group-hover:text-pink-500' />
								)}
								{isLiked && !isLiking && <IoMdHeart className='w-4 h-4 cursor-pointer text-pink-500 ' />}

								<span
									className={`text-sm text-slate-500 group-hover:text-pink-500 ${isLiked ? "text-pink-500" : ""
										}`}
								>
									{post.likes.length}
								</span>
							</div>
						</div>
						<div className='flex w-1/3 justify-end gap-2 items-center'>
							<IoBookmark className='w-4 h-4 text-slate-500 cursor-pointer hover:text-white' />
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
export default Post;
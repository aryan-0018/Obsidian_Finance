import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppDispatch, useTypedSelector } from "@/app/hook";
import { Loader } from "lucide-react";
import { useUpdateUserMutation } from "@/features/user/userAPI";
import { updateCredentials } from "@/features/auth/authSlice";

const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .optional(),
  profilePicture: z.string(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export function AccountForm() {
  const dispatch = useAppDispatch();
  const { user } = useTypedSelector((state) => state.auth);

  const [file, setFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [updateUserMutation, { isLoading }] = useUpdateUserMutation();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: user?.name || "",
      profilePicture: user?.profilePicture || "",
    },
  });

  const onSubmit = (values: AccountFormValues) => {
    console.log(values);
    if (isLoading) return;

    const formData = new FormData();
    formData.append("name", values.name || "");
    if (file) formData.append("profilePicture", file);

    updateUserMutation(formData)
      .unwrap()
      .then((response) => {
        dispatch(
          updateCredentials({
            user: {
              profilePicture: response.data.profilePicture,
              name: response.data.name,
            },
          })
        );
        toast.success("Account updated successfully");
      })
      .catch((error) => {
        toast.error(error.data.message || "Failed to update account");
      });
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-start space-y-3">
          <FormLabel className="text-xs font-medium text-[#a1a1aa]">Profile Avatar</FormLabel>
          <div className="flex items-center gap-5">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative group cursor-pointer">
                  <Avatar className="h-20 w-20 rounded-2xl border border-[#e5c158]/40 shadow-md">
                    <AvatarImage
                      src={avatarUrl || user?.profilePicture || ""}
                      className="!object-cover !object-center rounded-2xl"
                    />
                    <AvatarFallback className="text-xl font-light bg-[#161616] text-[#e5c158] rounded-2xl">
                      {form.watch("name")?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl backdrop-blur-xs">
                    <span className="text-[10px] text-white font-medium tracking-wider">VIEW</span>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md p-0 bg-transparent border-none">
                <DialogHeader className="sr-only">
                  <DialogTitle>Profile Photo</DialogTitle>
                  <DialogDescription>Full size preview of your profile photo</DialogDescription>
                </DialogHeader>
                <div className="relative aspect-square w-full">
                  <img
                    src={avatarUrl || user?.profilePicture || ""}
                    alt="Profile Preview"
                    className="w-full h-full object-contain rounded-3xl shadow-2xl"
                  />
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex flex-col gap-2 relative">
              <label
                htmlFor="profile-upload"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5c158] border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#c1a063]/50 text-white h-9 px-4 cursor-pointer max-w-[200px] active:scale-[0.98]"
              >
                Choose Photo
              </label>
              <Input
                id="profile-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-[11px] text-[#a1a1aa] font-normal">
                Recommended: Square JPG or PNG, at least 300x300px.
              </p>
            </div>
          </div>
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-[#a1a1aa]">Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your preferred name"
                  {...field}
                  className="rounded-xl bg-white/[0.03] border-white/[0.10] text-white focus-visible:ring-[#e5c158]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          disabled={isLoading}
          type="submit"
          className="rounded-xl bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] text-black font-semibold shadow-[0_4px_16px_rgba(193,160,99,0.28)] hover:brightness-105 active:scale-[0.98] transition-all px-8"
        >
          {isLoading && <Loader className="h-4 w-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}

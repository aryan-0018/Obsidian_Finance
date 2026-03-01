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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-col items-start space-y-4">
          <FormLabel>Profile Picture</FormLabel>
          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative group cursor-pointer">
                  <Avatar className="h-20 w-20 border border-[#c1a063]/30">
                    <AvatarImage
                      src={avatarUrl || user?.profilePicture || ""}
                      className="!object-cover !object-center"
                    />
                    <AvatarFallback className="text-2xl">
                      {form.watch("name")?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <span className="text-[10px] text-white font-medium">VIEW</span>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md p-0 bg-transparent border-none">
                <div className="relative aspect-square w-full">
                  <img
                    src={avatarUrl || user?.profilePicture || ""}
                    alt="Profile Preview"
                    className="w-full h-full object-contain rounded-lg shadow-2xl"
                  />
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex flex-col gap-2 relative">
              <label
                htmlFor="profile-upload"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-[#c1a063]/30 bg-[#111] hover:bg-[#c1a063]/10 text-white h-10 px-4 py-2 cursor-pointer max-w-[200px]"
              >
                Choose Custom Image
              </label>
              <Input
                id="profile-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Recommended: Square JPG, PNG, at least 300x300px.
              </p>
            </div>
          </div>
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your preferred name" {...field} className="bg-[#111] border-[#c1a063]/30 text-white focus-visible:ring-[#c1a063]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isLoading} type="submit" className="bg-[#c1a063] hover:bg-[#a88a4e] text-black border-none rounded-md px-8">
          {isLoading && <Loader className="h-4 w-4 animate-spin mr-2" />}
          Update Account
        </Button>
      </form>
    </Form>
  );
}

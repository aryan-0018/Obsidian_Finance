import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { AUTH_ROUTES } from "@/routes/common/routePath";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRegisterMutation, useGoogleLoginMutation } from "@/features/auth/authAPI";
import { GoogleLogin } from "@react-oauth/google";
import { useAppDispatch } from "@/app/hook";
import { setCredentials } from "@/features/auth/authSlice";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";
const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;
const SignUpForm = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const [googleLogin, { isLoading: isGoogleLoading }] = useGoogleLoginMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    register(values)
      .unwrap()
      .then(() => {
        form.reset();
        toast.success("Sign up successful");
        navigate(AUTH_ROUTES.SIGN_IN);
      })
      .catch((error) => {
        console.log(error);
        toast.error(error.data?.message || "Failed to sign up");
      });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3.5 sm:gap-4"
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Join Obsidian Finance</h1>
          <p className="text-balance text-xs text-[#a1a1aa] font-normal">
            Create your secure profile below
          </p>
        </div>
        <div className="grid gap-2.5 sm:gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-xs font-medium text-[#a1a1aa]">Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Aryan Sharma"
                    className="h-9 sm:h-10 text-sm rounded-xl bg-white/[0.04] border-white/[0.10] text-white focus-visible:ring-[#e5c158]"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-xs font-medium text-[#a1a1aa]">Email Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="you@example.com"
                    className="h-9 sm:h-10 text-sm rounded-xl bg-white/[0.04] border-white/[0.10] text-white focus-visible:ring-[#e5c158]"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-xs font-medium text-[#a1a1aa]">Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Min. 6 characters"
                    className="h-9 sm:h-10 text-sm rounded-xl bg-white/[0.04] border-white/[0.10] text-white focus-visible:ring-[#e5c158]"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-2 pt-1">
            <Button
              disabled={isLoading || isGoogleLoading}
              type="submit"
              className="w-full h-9 sm:h-10 rounded-xl bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] text-black font-semibold text-sm shadow-[0_4px_16px_rgba(193,160,99,0.28)] hover:brightness-105 active:scale-[0.98] transition-all duration-150 cursor-pointer"
            >
              {isLoading && <Loader className="h-4 w-4 animate-spin mr-2" />}
              Create Account
            </Button>

            <div className="relative border-b border-white/10 my-1">
              <span className="absolute bg-[#0b0b0e] px-2 text-[10px] text-[#a1a1aa] uppercase tracking-widest top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                OR
              </span>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  googleLogin({ token: credentialResponse.credential })
                    .unwrap()
                    .then((data) => {
                      dispatch(setCredentials(data));
                      toast.success("Account created via Google successfully");
                      setTimeout(() => navigate(PROTECTED_ROUTES.OVERVIEW), 1000);
                    })
                    .catch((error) => {
                      toast.error(error.data?.message || "Google Signup processing failed");
                    });
                }}
                onError={() => {
                  toast.error("Google authentication failed");
                }}
                theme="filled_black"
                shape="pill"
                width="300"
                text="signup_with"
              />
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-[#a1a1aa] pt-0.5">
          Already have an account?{" "}
          <Link
            to={AUTH_ROUTES.SIGN_IN}
            className="text-[#e5c158] hover:underline underline-offset-4 font-semibold"
          >
            Sign in
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default SignUpForm;

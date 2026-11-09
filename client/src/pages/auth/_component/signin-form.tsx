import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { AUTH_ROUTES, PROTECTED_ROUTES } from "@/routes/common/routePath";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { useLoginMutation, useGoogleLoginMutation } from "@/features/auth/authAPI";
import { useAppDispatch } from "@/app/hook";
import { setCredentials } from "@/features/auth/authSlice";
import { GoogleLogin } from "@react-oauth/google";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

const SignInForm = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [googleLogin, { isLoading: isGoogleLoading }] = useGoogleLoginMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    login(values)
      .unwrap()
      .then((data) => {
        dispatch(setCredentials(data));
        toast.success("Login successful");
        setTimeout(() => {
          navigate(PROTECTED_ROUTES.OVERVIEW);
        }, 1000);
      })
      .catch((error) => {
        console.log(error);
        toast.error(error.data?.message || "Failed to login");
      });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("flex flex-col gap-4 sm:gap-4.5", className)}
        {...props}
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Access your portfolio</h1>
          <p className="text-balance text-xs text-[#a1a1aa] font-normal">
            Enter your credentials securely to access your account
          </p>
        </div>
        <div className="grid gap-3.5">
          <div className="grid gap-1.5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
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
          </div>
          <div className="grid gap-1.5">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-medium text-[#a1a1aa]">Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your password"
                      type="password"
                      className="h-9 sm:h-10 text-sm rounded-xl bg-white/[0.04] border-white/[0.10] text-white focus-visible:ring-[#e5c158]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-col gap-2.5 pt-1">
            <Button
              disabled={isLoading || isGoogleLoading}
              type="submit"
              className="w-full h-9 sm:h-10 rounded-xl bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] text-black font-semibold text-sm shadow-[0_4px_16px_rgba(193,160,99,0.28)] hover:brightness-105 active:scale-[0.98] transition-all duration-150 cursor-pointer"
            >
              {isLoading && <Loader className="h-4 w-4 animate-spin mr-2" />}
              Sign In
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
                      toast.success("Login with Google successful");
                      setTimeout(() => navigate(PROTECTED_ROUTES.OVERVIEW), 1000);
                    })
                    .catch((error) => {
                      toast.error(error.data?.message || "Google Login processing failed");
                    });
                }}
                onError={() => {
                  toast.error("Google authentication failed");
                }}
                theme="filled_black"
                shape="pill"
                width="300"
              />
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-[#a1a1aa] pt-0.5">
          Don&apos;t have an account?{" "}
          <Link
            to={AUTH_ROUTES.SIGN_UP}
            className="text-[#e5c158] hover:underline underline-offset-4 font-semibold"
          >
            Create account
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default SignInForm;

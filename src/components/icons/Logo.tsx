import { cn } from '@/utils/cn'; // Adjust the path as necessary based on your project structure

type LogoProps = {
  className?: string;
};

const Logo = ({ className, ...props }: LogoProps) => (
  <div className={cn('text-xl font-bold', className)} {...props}>
    JobFinder-AI
  </div>
);

export default Logo;
